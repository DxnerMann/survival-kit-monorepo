package com.survivalkit.backend.adapter.postgres.draw;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.survivalkit.backend.core.draw.DrawStroke;
import io.viascom.nanoid.NanoId;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class DrawBoardRepository {

    private static final int MAX_STROKES = 500;
    private static final int MAX_JSON_CHARS = 800_000;
    private static final TypeReference<List<DrawStroke>> STROKE_LIST = new TypeReference<>() {};

    private final JdbcClient jdbcClient;
    private final ObjectMapper objectMapper;

    public DrawBoardRepository(JdbcClient jdbcClient, ObjectMapper objectMapper) {
        this.jdbcClient = jdbcClient;
        this.objectMapper = objectMapper;
    }

    public List<String> widgetData(String userId) {
        return jdbcClient.sql(Statements.WIDGET_DATA.sql)
                .paramSource(new MapSqlParameterSource("userId", userId))
                .query(String.class)
                .list();
    }

    public Optional<Row> findById(String id) {
        return jdbcClient.sql(Statements.BY_ID.sql)
                .paramSource(new MapSqlParameterSource("id", id))
                .query(this::mapRow)
                .optional();
    }

    @Transactional
    public Locked ensure(String userLow, String userHigh, String today) {
        var inserted = jdbcClient.sql(Statements.INSERT.sql)
                .paramSource(params(userLow, userHigh)
                        .addValue("id", NanoId.generate(21))
                        .addValue("day", today)
                        .addValue("now", Timestamp.from(Instant.now())))
                .update();
        var row = lock(userLow, userHigh);
        if (!today.equals(row.day())) {
            row = clear(row, today);
        }
        return new Locked(row, inserted > 0);
    }

    @Transactional
    public Optional<Written> upsert(String userLow, String userHigh, String today, DrawStroke stroke) {
        var row = ensure(userLow, userHigh, today).row();
        var strokes = readStrokes(row.strokes());
        var index = indexOf(strokes, stroke.id());
        if (index >= 0) {
            if (!stroke.authorId().equals(strokes.get(index).authorId())) {
                return Optional.empty();
            }
            strokes.set(index, stroke);
        } else {
            while (strokes.size() >= MAX_STROKES) {
                strokes.removeFirst();
            }
            strokes.add(stroke);
        }
        var json = writeStrokes(strokes);
        if (json.length() > MAX_JSON_CHARS) {
            while (strokes.size() > 1 && writeStrokes(strokes).length() > MAX_JSON_CHARS) {
                strokes.removeFirst();
            }
            json = writeStrokes(strokes);
            if (json.length() > MAX_JSON_CHARS) {
                return Optional.empty();
            }
        }
        save(row, today, json, row.resetLow(), row.resetHigh());
        return Optional.of(new Written(row.id(), stroke));
    }

    @Transactional
    public Optional<Written> remove(String userLow, String userHigh, String today, String strokeId, String authorId) {
        var row = ensure(userLow, userHigh, today).row();
        var strokes = readStrokes(row.strokes());
        var index = indexOf(strokes, strokeId);
        if (index < 0 || !authorId.equals(strokes.get(index).authorId())) {
            return Optional.empty();
        }
        var removed = strokes.remove(index);
        save(row, today, writeStrokes(strokes), row.resetLow(), row.resetHigh());
        return Optional.of(new Written(row.id(), removed));
    }

    @Transactional
    public Optional<Written> removeLastByAuthor(String userLow, String userHigh, String today, String authorId) {
        var row = ensure(userLow, userHigh, today).row();
        var strokes = readStrokes(row.strokes());
        for (var index = strokes.size() - 1; index >= 0; index--) {
            if (!authorId.equals(strokes.get(index).authorId())) {
                continue;
            }
            var removed = strokes.remove(index);
            save(row, today, writeStrokes(strokes), row.resetLow(), row.resetHigh());
            return Optional.of(new Written(row.id(), removed));
        }
        return Optional.empty();
    }

    @Transactional
    public Vote vote(String userLow, String userHigh, String today, boolean selfIsLow, boolean want) {
        var row = ensure(userLow, userHigh, today).row();
        if (userLow.equals(userHigh)) {
            if (!want) {
                return new Vote(row, false);
            }
            return new Vote(save(row, today, "[]", false, false), true);
        }
        var resetLow = selfIsLow ? want : row.resetLow();
        var resetHigh = selfIsLow ? row.resetHigh() : want;
        var cleared = resetLow && resetHigh;
        var strokes = cleared ? "[]" : row.strokes();
        if (cleared) {
            resetLow = false;
            resetHigh = false;
        }
        var saved = save(row, today, strokes, resetLow, resetHigh);
        return new Vote(saved, cleared);
    }

    public List<DrawStroke> readStrokes(String json) {
        if (json == null || json.isBlank()) {
            return new ArrayList<>();
        }
        try {
            var parsed = objectMapper.readValue(json, STROKE_LIST);
            return parsed == null ? new ArrayList<>() : new ArrayList<>(parsed);
        } catch (Exception ex) {
            return new ArrayList<>();
        }
    }

    private Row lock(String userLow, String userHigh) {
        return jdbcClient.sql(Statements.LOCK_PAIR.sql)
                .paramSource(params(userLow, userHigh))
                .query(this::mapRow)
                .single();
    }

    private Row clear(Row row, String today) {
        return save(row, today, "[]", false, false);
    }

    private Row save(Row row, String day, String strokes, boolean resetLow, boolean resetHigh) {
        jdbcClient.sql(Statements.UPDATE.sql)
                .paramSource(new MapSqlParameterSource("id", row.id())
                        .addValue("day", day)
                        .addValue("strokes", strokes)
                        .addValue("resetLow", resetLow)
                        .addValue("resetHigh", resetHigh)
                        .addValue("now", Timestamp.from(Instant.now())))
                .update();
        return new Row(row.id(), row.userLow(), row.userHigh(), day, strokes, resetLow, resetHigh);
    }

    private String writeStrokes(List<DrawStroke> strokes) {
        try {
            return objectMapper.writeValueAsString(strokes);
        } catch (Exception ex) {
            return "[]";
        }
    }

    private int indexOf(List<DrawStroke> strokes, String id) {
        for (var index = 0; index < strokes.size(); index++) {
            if (id.equals(strokes.get(index).id())) {
                return index;
            }
        }
        return -1;
    }

    private MapSqlParameterSource params(String userLow, String userHigh) {
        return new MapSqlParameterSource("userLow", userLow).addValue("userHigh", userHigh);
    }

    private Row mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new Row(
                rs.getString("id"),
                rs.getString("user_low"),
                rs.getString("user_high"),
                rs.getString("day"),
                rs.getString("strokes"),
                rs.getBoolean("reset_low"),
                rs.getBoolean("reset_high")
        );
    }

    public record Row(
            String id,
            String userLow,
            String userHigh,
            String day,
            String strokes,
            boolean resetLow,
            boolean resetHigh
    ) {
    }

    public record Locked(Row row, boolean created) {
    }

    public record Vote(Row row, boolean cleared) {
    }

    public record Written(String boardId, DrawStroke stroke) {
    }

    private enum Statements {
        WIDGET_DATA("""
                SELECT data FROM userWidgets WHERE userId = :userId AND type = 'DRAW'
                """),
        BY_ID("""
                SELECT id, user_low, user_high, day, strokes, reset_low, reset_high
                FROM draw_boards
                WHERE id = :id
                """),
        INSERT("""
                INSERT INTO draw_boards (id, user_low, user_high, day, strokes, reset_low, reset_high, updated_at)
                VALUES (:id, :userLow, :userHigh, :day, '[]', FALSE, FALSE, :now)
                ON CONFLICT (user_low, user_high) DO NOTHING
                """),
        LOCK_PAIR("""
                SELECT id, user_low, user_high, day, strokes, reset_low, reset_high
                FROM draw_boards
                WHERE user_low = :userLow AND user_high = :userHigh
                FOR UPDATE
                """),
        UPDATE("""
                UPDATE draw_boards
                SET day = :day,
                    strokes = :strokes,
                    reset_low = :resetLow,
                    reset_high = :resetHigh,
                    updated_at = :now
                WHERE id = :id
                """);

        private final String sql;

        Statements(String sql) {
            this.sql = sql;
        }
    }
}
