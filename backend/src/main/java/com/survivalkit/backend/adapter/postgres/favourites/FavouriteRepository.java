package com.survivalkit.backend.adapter.postgres.favourites;

import com.survivalkit.backend.adapter.postgres.logs.Log;
import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.core.security.SecurityLog;
import com.survivalkit.backend.shared.Page;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;

import static com.survivalkit.backend.shared.ContinuationTokenHelper.decode;
import static com.survivalkit.backend.shared.ContinuationTokenHelper.encode;

@Repository
public class FavouriteRepository implements FavouritePersistancePort {

    private final JdbcClient jdbcClient;
    private final SecurityLog securityLog;

    public FavouriteRepository(JdbcClient jdbcClient, SecurityLog securityLog) {
        this.jdbcClient = jdbcClient;
        this.securityLog = securityLog;
    }

    @Override
    public void addFav(String userId, String quickLinkId) {
        jdbcClient.sql(Statements.SET_FAV.sql)
                .paramSource(new MapSqlParameterSource("userId", userId)
                        .addValue("quickLinkId", quickLinkId)
                ).update();
        securityLog.logInfo(ErrorCode.ErrorCategory.QUICKLINK, String.format("New Favourite saved for user %s with ID %s", userId, quickLinkId));
    }

    @Override
    public void deleteFav(String userId, String quickLinkId) {
        jdbcClient.sql(Statements.DELETE_FAV.sql)
                .paramSource(new MapSqlParameterSource("userId", userId)
                        .addValue("quickLinkId", quickLinkId)
                ).update();
    }

    @Override
    public void deleteAll(String userId) {
        jdbcClient.sql(Statements.DELETE_ALL.sql)
                .paramSource(new MapSqlParameterSource("userId", userId)
                ).update();
    }

    @Override
    public void deleteByQuickLink(String quickLinkId) {
        jdbcClient.sql(Statements.DELETE_BY_QUICKLINK.sql)
                .paramSource(new MapSqlParameterSource("quickLinkId", quickLinkId))
                .update();
    }

    @Override
    public Page<String> getFavouritesForUser(String userId, String continuation, int pageSize) {
        var quicklinkIds = jdbcClient.sql(Statements.GET_FOR_USER.sql)
                .paramSource(new MapSqlParameterSource("userId", userId)
                        .addValue("pageSize", pageSize + 1)
                        .addValue("continuation", decode(continuation))
                ).query(String.class)
                .list();

        if (quicklinkIds.size() <= pageSize) {
            return new Page<>(quicklinkIds, null);
        }
        var page = List.copyOf(quicklinkIds.subList(0, pageSize));
        return new Page<>(page, encode(page.getLast()));
    }

    private enum Statements {
        // language=sql
        SET_FAV(
                """
                    INSERT INTO favourites (userId, quickLinkId) VALUES (:userId, :quickLinkId) ON CONFLICT (userId, quickLinkId) DO NOTHING
                    """
        ),
        // language=sql
        DELETE_FAV(
                """
                    DELETE FROM favourites WHERE userId = :userId AND quickLinkId = :quickLinkId
                    """
        ),
        // language=sql
        GET_FOR_USER(
                """
                    SELECT quicklinkid 
                    FROM favourites 
                    WHERE userId = :userId
                    AND (:continuation::TEXT IS NULL OR quickLinkId > :continuation)
                    ORDER BY quickLinkId
                    LIMIT :pageSize
                    """
        ),
        // language=sql
        DELETE_ALL(
        """
                DELETE FROM favourites WHERE userId = :userId
            """
        ),
        // language=sql
        DELETE_BY_QUICKLINK(
                """
                    DELETE FROM favourites WHERE quickLinkId = :quickLinkId
                    """
        );

        private String sql;

        Statements(String sql) {
            this.sql = sql;
        }
    }
}
