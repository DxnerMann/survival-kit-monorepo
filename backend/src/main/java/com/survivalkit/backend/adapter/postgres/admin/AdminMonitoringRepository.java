package com.survivalkit.backend.adapter.postgres.admin;

import com.survivalkit.backend.core.admin.StorageCategory;
import com.survivalkit.backend.core.admin.StorageUsage;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

@Repository
public class AdminMonitoringRepository {

    static final long CAPACITY_BYTES = 100L * 1024 * 1024 * 1024;

    private static final String MEASURE_SQL = """
            SELECT
              pg_database_size(current_database()) AS database_bytes,
              COALESCE(pg_total_relation_size(to_regclass('users')), 0) AS users_bytes,
              (SELECT COUNT(*) FROM users) AS users_items,
              COALESCE(pg_total_relation_size(to_regclass('userWidgets')), 0) AS widgets_bytes,
              (SELECT COUNT(*) FROM userWidgets) AS widgets_items,
              COALESCE(pg_total_relation_size(to_regclass('courses')), 0) AS courses_bytes,
              (SELECT COUNT(*) FROM courses) AS courses_items,
              COALESCE(pg_total_relation_size(to_regclass('quicklinks')), 0)
                + COALESCE(pg_total_relation_size(to_regclass('favourites')), 0) AS quicklinks_bytes,
              (SELECT COUNT(*) FROM quicklinks) AS quicklinks_items,
              COALESCE(pg_total_relation_size(to_regclass('feedback')), 0)
                + COALESCE(pg_total_relation_size(to_regclass('feedbackVotes')), 0) AS feedback_bytes,
              (SELECT COUNT(*) FROM feedback) AS feedback_items,
              COALESCE(pg_total_relation_size(to_regclass('securityLogs')), 0)
                + COALESCE(pg_total_relation_size(to_regclass('trackActions')), 0) AS logs_bytes,
              (SELECT COUNT(*) FROM securityLogs) AS logs_items,
              COALESCE(pg_total_relation_size(to_regclass('caffeineEntries')), 0) AS caffeine_bytes,
              (SELECT COUNT(*) FROM caffeineEntries) AS caffeine_items,
              COALESCE(pg_total_relation_size(to_regclass('presentation_game_rooms')), 0)
                + COALESCE(pg_total_relation_size(to_regclass('presentation_game_room_members')), 0)
                + COALESCE(pg_total_relation_size(to_regclass('presentation_game_room_words')), 0)
                + COALESCE(pg_total_relation_size(to_regclass('presentation_game_word_votes')), 0) AS presentation_bytes,
              (SELECT COUNT(*) FROM presentation_game_rooms) AS presentation_items,
              COALESCE(pg_total_relation_size(to_regclass('memes')), 0) AS memes_bytes,
              (SELECT COUNT(*) FROM memes) AS memes_items,
              COALESCE(pg_total_relation_size(to_regclass('chatMessages')), 0)
                + COALESCE(pg_total_relation_size(to_regclass('chatAttachments')), 0) AS chat_bytes,
              (SELECT COUNT(*) FROM chatMessages) AS chat_items
            """;

    private final JdbcClient jdbcClient;

    public AdminMonitoringRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public boolean databaseUp() {
        try {
            Integer one = jdbcClient.sql("SELECT 1").query(Integer.class).single();
            return one != null && one == 1;
        } catch (RuntimeException ex) {
            return false;
        }
    }

    public StorageUsage measure() {
        return jdbcClient.sql(MEASURE_SQL)
                .query((rs, rowNum) -> {
                    long database = rs.getLong("database_bytes");
                    var slices = List.of(
                            category("users", "Nutzer", rs.getLong("users_bytes"), rs.getLong("users_items")),
                            category("widgets", "Widgets", rs.getLong("widgets_bytes"), rs.getLong("widgets_items")),
                            category("courses", "Kurse", rs.getLong("courses_bytes"), rs.getLong("courses_items")),
                            category("quicklinks", "Quicklinks", rs.getLong("quicklinks_bytes"), rs.getLong("quicklinks_items")),
                            category("feedback", "Feedback", rs.getLong("feedback_bytes"), rs.getLong("feedback_items")),
                            category("logs", "Logs", rs.getLong("logs_bytes"), rs.getLong("logs_items")),
                            category("caffeine", "Koffein", rs.getLong("caffeine_bytes"), rs.getLong("caffeine_items")),
                            category("presentation", "Präsentation", rs.getLong("presentation_bytes"), rs.getLong("presentation_items")),
                            category("memes", "Memes", rs.getLong("memes_bytes"), rs.getLong("memes_items")),
                            category("chat", "Chat", rs.getLong("chat_bytes"), rs.getLong("chat_items"))
                    );
                    long known = slices.stream().mapToLong(StorageCategory::bytes).sum();
                    var all = new ArrayList<>(slices);
                    all.add(category("other", "Sonstiges", Math.max(0, database - known), 0));
                    return new StorageUsage(database, CAPACITY_BYTES, List.copyOf(all));
                })
                .single();
    }

    private static StorageCategory category(String id, String label, long bytes, long items) {
        return new StorageCategory(id, label, bytes, items);
    }
}
