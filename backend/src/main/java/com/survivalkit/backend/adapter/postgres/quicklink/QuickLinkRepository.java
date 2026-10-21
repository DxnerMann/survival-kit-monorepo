package com.survivalkit.backend.adapter.postgres.quicklink;

import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.core.qucklink.QuickLinkSort;
import com.survivalkit.backend.core.security.SecurityLog;
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
    private final SecurityLog securityLog;

    public QuickLinkRepository(JdbcClient jdbcClient, SecurityLog securityLog) {
        this.jdbcClient = jdbcClient;
        this.securityLog = securityLog;
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
    public Page<QuickLink> getQuickLinksFiltered(boolean approved, int pageSize, String continuation, QuickLinkSort sort) {
        var cursor = sort.decode(decode(continuation));
        var quicklinks = jdbcClient.sql(Statements.GET_FILTERED.sql)
                .paramSource(new MapSqlParameterSource("approved", approved)
                        .addValue("pageSize", pageSize)
                        .addValue("sort", sort.name())
                        .addValue("continuationClicks", cursor.clicks(), Types.INTEGER)
                        .addValue("continuationAddedAt", toTimestamp(cursor.addedAt()), Types.TIMESTAMP)
                        .addValue("continuationId", cursor.id(), Types.VARCHAR)
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
                encode(sort.encode(quicklinks.getLast()))
        );
    }

    @Override
    public List<QuickLink> listQuickLinks(boolean approved) {
        return jdbcClient.sql(Statements.LIST.sql)
                .paramSource(new MapSqlParameterSource("approved", approved))
                .query(QuickLink.class)
                .list();
    }

    @Override
    public void approveQuickLink(String id, String title, String description) {
        jdbcClient.sql(Statements.APPROVE.sql)
                .paramSource(new MapSqlParameterSource("id", id)
                        .addValue("title", title, Types.VARCHAR)
                        .addValue("description", description, Types.VARCHAR)
                        .addValue("lastUpdated", toTimestamp(java.time.Instant.now()))
                ).update();
        securityLog.logInfo(ErrorCode.ErrorCategory.QUICKLINK, String.format("Quicklink %s approved", id));
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

        if (quickLink.approvedByAdmin()) {
            securityLog.logInfo(ErrorCode.ErrorCategory.QUICKLINK, String.format("Quicklink %s updated", quickLink.id()));
        } else {
            securityLog.logInfo(ErrorCode.ErrorCategory.QUICKLINK, String.format("New Quicklink suggestion created with id %s", quickLink.id()));
        }
    }

    @Override
    public void deleteQuickLink(String id) {
        jdbcClient.sql(Statements.DELETE.sql)
                .paramSource(new MapSqlParameterSource("id", id))
                .update();
        securityLog.logInfo(ErrorCode.ErrorCategory.QUICKLINK, String.format("Quicklink with id %s deleted. ", id));
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
                      AND (
                        :continuationId::TEXT IS NULL
                        OR (
                          :sort = 'POPULAR'
                          AND :continuationClicks::INTEGER IS NOT NULL
                          AND (
                            COALESCE(clickedThisMonth, 0) < :continuationClicks
                            OR (
                              COALESCE(clickedThisMonth, 0) = :continuationClicks
                              AND id > :continuationId
                            )
                          )
                        )
                        OR (
                          :sort = 'LEAST_POPULAR'
                          AND :continuationClicks::INTEGER IS NOT NULL
                          AND (
                            COALESCE(clickedThisMonth, 0) > :continuationClicks
                            OR (
                              COALESCE(clickedThisMonth, 0) = :continuationClicks
                              AND id > :continuationId
                            )
                          )
                        )
                        OR (
                          :sort = 'NEWEST'
                          AND :continuationAddedAt::TIMESTAMP IS NOT NULL
                          AND (
                            COALESCE(addedAt, TIMESTAMP '1970-01-01 00:00:00') < :continuationAddedAt
                            OR (
                              COALESCE(addedAt, TIMESTAMP '1970-01-01 00:00:00') = :continuationAddedAt
                              AND id < :continuationId
                            )
                          )
                        )
                        OR (
                          :sort = 'OLDEST'
                          AND :continuationAddedAt::TIMESTAMP IS NOT NULL
                          AND (
                            COALESCE(addedAt, TIMESTAMP '1970-01-01 00:00:00') > :continuationAddedAt
                            OR (
                              COALESCE(addedAt, TIMESTAMP '1970-01-01 00:00:00') = :continuationAddedAt
                              AND id > :continuationId
                            )
                          )
                        )
                        OR (
                          :sort = 'ID'
                          AND id > :continuationId
                        )
                      )
                    ORDER BY
                      CASE WHEN :sort = 'POPULAR' THEN COALESCE(clickedThisMonth, 0) END DESC,
                      CASE WHEN :sort = 'LEAST_POPULAR' THEN COALESCE(clickedThisMonth, 0) END ASC,
                      CASE WHEN :sort = 'NEWEST' THEN COALESCE(addedAt, TIMESTAMP '1970-01-01 00:00:00') END DESC,
                      CASE WHEN :sort = 'OLDEST' THEN COALESCE(addedAt, TIMESTAMP '1970-01-01 00:00:00') END ASC,
                      CASE WHEN :sort = 'NEWEST' THEN id END DESC,
                      id ASC
                    LIMIT :pageSize
                    """
        ),
        // language=sql
        LIST(
                """
                    SELECT *
                    FROM quicklinks
                    WHERE approvedByAdmin = :approved
                    """
        ),
        // language=sql
        APPROVE(
                """
                    UPDATE quicklinks
                    SET approvedByAdmin = TRUE,
                        title = COALESCE(:title, title),
                        description = COALESCE(:description, description),
                        lastUpdated = :lastUpdated
                    WHERE id = :id
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
