package com.survivalkit.backend.adapter.postgres.logs;

import com.survivalkit.backend.shared.Page;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;

import static com.survivalkit.backend.shared.ContinuationTokenHelper.decode;
import static com.survivalkit.backend.shared.ContinuationTokenHelper.encode;
import static com.survivalkit.backend.shared.Utils.toTimestamp;

@Repository
public class SecurityLogRepository implements SecurityLogPersistancePort {

    private final JdbcClient jdbcClient;

    public SecurityLogRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public void saveLog(Log log) {
        jdbcClient.sql(Statements.SAVE.sql)
                .paramSource(new MapSqlParameterSource("type", log.type().toString())
                        .addValue("subType", log.subType().toString())
                        .addValue("timestamp", toTimestamp(log.timestamp()))
                        .addValue("message", log.message())
                ).update();
    }

    @Override
    public Page<Log> getLatestLogs(int pageSize, String continuation) {
        var test = decode(continuation);
        var logs = jdbcClient.sql(Statements.GET.sql)
                .paramSource(new MapSqlParameterSource("pageSize", pageSize)
                        .addValue("continuation", decode(continuation))
                ).query(Log.class)
                .list();

        if (logs.isEmpty()) {
            return new Page<>(
                    List.of(),
                    null
            );
        }
        return new Page<>(
                logs,
                encode(logs.getLast().timestamp().toString())
        );
    }

    @Override
    public void deleteOlderThan7Days() {
        jdbcClient.sql(Statements.DELETE_OLDER_THAN_7_DAYS.sql).update();
    }

    private enum Statements {

        // language=sql
        SAVE("""
            INSERT INTO securityLogs (type, subType, timestamp, message)
            VALUES (:type, :subType, :timestamp, :message)
            ON CONFLICT (timestamp) DO NOTHING;
        """
        ),
        // language=sql
        GET("""
            SELECT * FROM securityLogs 
            WHERE  (:continuation::TIMESTAMPTZ IS NULL OR timestamp < :continuation::TIMESTAMPTZ)
            ORDER BY timestamp DESC
            LIMIT :pageSize
        """
        ),
        // language=sql
        DELETE_OLDER_THAN_7_DAYS("""
            DELETE FROM securityLogs
            WHERE timestamp < now() - INTERVAL '7 days';
        """);


        private final String sql;

        Statements(String sql) {
            this.sql = sql;
        }
    }
}
