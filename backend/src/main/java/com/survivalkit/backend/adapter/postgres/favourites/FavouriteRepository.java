package com.survivalkit.backend.adapter.postgres.favourites;

import com.survivalkit.backend.adapter.postgres.logs.Log;
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
        securityLog.logInfo(Log.SecurityLogSubType.DATABASE, String.format("New Favourite saved for user %s with ID %s", userId, quickLinkId));
    }

    @Override
    public void deleteFav(String userId, String quickLinkId) {
        jdbcClient.sql(Statements.DELETE_FAV.sql)
                .paramSource(new MapSqlParameterSource("userId", userId)
                        .addValue("quickLinkId", quickLinkId)
                ).update();
    }

    @Override
    public Page<String> getFavouritesForUser(String userId, String continuation, int pageSize) {
        var quicklinkIds = jdbcClient.sql(Statements.GET_FOR_USER.sql)
                .paramSource(new MapSqlParameterSource("userId", userId)
                        .addValue("pageSize", pageSize)
                        .addValue("continuation", decode(continuation))
                ).query(String.class)
                .list();

        if (quicklinkIds.isEmpty()) {
            return new Page<>(
                    List.of(),
                    null
            );
        }
        return new Page<>(
                quicklinkIds,
                encode(quicklinkIds.getLast())
        );
    }

    private enum Statements {
        // language=sql
        SET_FAV(
                """
                    INSERT INTO favourites (userId, quickLinkId) VALUES (:userId, :quickLinkId)
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
        );

        private String sql;

        Statements(String sql) {
            this.sql = sql;
        }
    }
}
