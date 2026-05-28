package com.survivalkit.backend.adapter.postgres.quicklink;

import com.survivalkit.backend.shared.Page;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.Types;
import java.util.List;

import static com.survivalkit.backend.shared.ContinuationTokenHelper.decode;
import static com.survivalkit.backend.shared.ContinuationTokenHelper.encode;
import static com.survivalkit.backend.shared.Utils.toTimestamp;

@Repository
public class QuickLinkRepository implements QuickLinkPersistancePort {

    private final JdbcClient jdbcClient;

    public QuickLinkRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public void incrementClickedLink(String id) {
        jdbcClient.sql(Statements.INCREMENT_CLICKS.sql).paramSource(new MapSqlParameterSource("id", id)).update();
    }

    @Override
    public void incrementFavCount(String id) {
        jdbcClient.sql(Statements.INCREMENT_FAVS.sql).paramSource(new MapSqlParameterSource("id", id)).update();
    }

    @Override
    public Page<QuickLink> getQuickLinksFiltered(boolean approved, int pageSize, String continuation, boolean sortByPopularity) {
        var quicklinks = jdbcClient.sql(Statements.GET_FILTERED.sql)
                .paramSource(new MapSqlParameterSource("approved", approved)
                        .addValue("pageSize", pageSize)
                        .addValue("sortByPopularity", sortByPopularity)
                        .addValue("continuation", decode(continuation))
                ).query(QuickLink.class)
                .list();

        if (quicklinks.isEmpty()) {
            return new Page<>(
                    List.of(),
                    null
            );
        }
        return new Page<>(
                quicklinks,
                encode(quicklinks.getLast().id())
        );
    }

    @Override
    public void upsertquickLink(QuickLink quickLink) {
        jdbcClient.sql(Statements.UPSERT.sql)
                .paramSource(new MapSqlParameterSource("id", quickLink.id())
                        .addValue("title", quickLink.title())
                        .addValue("description", quickLink.description())
                        .addValue("url", quickLink.url())
                        .addValue("clickedThisMonth", quickLink.clickedThisMonth())
                        .addValue("clickedOverall", quickLink.clickedOverall())
                        .addValue("favouriteCount", quickLink.favouriteCount())
                        .addValue("approvedByAdmin", quickLink.approvedByAdmin())
                        .addValue("addedAt", toTimestamp(quickLink.addedAt()))
                        .addValue("lastUpdated", toTimestamp(quickLink.lastUpdated()))
                        .addValue("lastReset", toTimestamp(quickLink.lastReset()))
                ).update();
    }

    @Override
    public void deleteQuickLink(String id) {
        jdbcClient.sql(Statements.DELETE.sql)
                .paramSource(new MapSqlParameterSource("id", id))
                .update();
    }

    @Override
    public List<QuickLink> getFromIds(List<String> ids) {
         return jdbcClient.sql(Statements.GET_FROM_LIST.sql)
                .paramSource(new MapSqlParameterSource("ids", ids))
                .query(QuickLink.class)
                .list();
    }

    private enum Statements {
        // language=sql
        INCREMENT_CLICKS(
                """
                    UPDATE quicklinks SET clickedThisMonth = clickedThisMonth + 1, clickedOverall = clickedOverall + 1 WHERE id = :id;
                    """
        ),
        // language=sql
        INCREMENT_FAVS(
                """
                    UPDATE quicklinks SET favouriteCount = favouriteCount + 1 WHERE id = :id;
                    """
        ),
        // language=sql
        GET_FILTERED(
                """
                        SELECT *
                    FROM quicklinks
                    WHERE (:approved::BOOLEAN IS NULL OR approvedByAdmin = :approved)
                      AND (:continuation::TEXT IS NULL OR id > :continuation)
                    ORDER BY
                      CASE\s
                        WHEN :sortByPopularity::BOOLEAN = TRUE THEN clickedThisMonth
                        ELSE NULL
                      END DESC,
                      id ASC
                    LIMIT :pageSize;
                    """
        ),
        // language=sql
        UPSERT(
                """
                    INSERT INTO quicklinks (id, title, description, url, clickedThisMonth, clickedOverall, favouriteCount, approvedByAdmin, addedAt, lastUpdated, lastReset)
                    VALUES (:id, :title, :description, :url, :clickedThisMonth, :clickedOverall, :favouriteCount, :approvedByAdmin, :addedAt, :lastUpdated, :lastReset)
                    ON CONFLICT (id)
                    DO UPDATE SET 
                                  approvedByAdmin = :approvedByAdmin, 
                                  lastUpdated = :lastUpdated, 
                                  title = :title, 
                                  description = :description
                    """
        ),
        // language=sql
        DELETE(
                """
                    DELETE FROM quicklinks WHERE id = :id
                    """
        ),
        // language=sql
        GET_FROM_LIST(
                """
                    SELECT * FROM quicklinks WHERE id IN (:ids) ORDER BY id
                    """
        );

        private String sql;

        Statements(String sql) {
            this.sql = sql;
        }
    }
}
