package com.survivalkit.backend.adapter.postgres.widget;

import io.viascom.nanoid.NanoId;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public class UserWidgetRepository implements UserWidgetPersistancePort {

    private final JdbcClient jdbcClient;

    public UserWidgetRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public List<UserWidgetModel> getAllForUser(String userId) {
        return jdbcClient.sql(Statements.GET_ALL_FOR_USER.sql)
                .paramSource(new MapSqlParameterSource("userId", userId))
                .query(UserWidgetModel.class).list();
    }

    @Transactional
    @Override
    public void overrideAll(List<UserWidgetModel> userWidgets, String userId) {
        jdbcClient.sql(Statements.DELETE_FOR_USER.sql)
                .paramSource(new MapSqlParameterSource("userId", userId))
                .update();

        userWidgets.forEach(widget -> {
            jdbcClient.sql(Statements.INSERT.sql)
                    .paramSource(new MapSqlParameterSource("id", NanoId.generate(25))
                            .addValue("userId", userId)
                            .addValue("type", widget.type().toString())
                            .addValue("x", widget.x())
                            .addValue("y", widget.y())
                            .addValue("width", widget.width())
                            .addValue("height", widget.height())
                            .addValue("data", widget.data()))
                    .update();
        });
    }

    @Override
    public void saveDataForWidget(String id, String data) {
        jdbcClient.sql(Statements.UPDATE_DATA.sql)
                .paramSource(new MapSqlParameterSource("id", id)
                        .addValue("data", data))
                .update();
    }

    public enum Statements {
        // language=sql
        GET_ALL_FOR_USER(
        """
            SELECT id, type, x, y, width, height, data FROM userWidgets WHERE userId = :userId
            """
        ),
        // language=sql
        DELETE_FOR_USER(
        """
            DELETE FROM userWidgets WHERE userId = :userId
            """
        ),
        // language=sql
        INSERT(
    """
        INSERT INTO userWidgets (id, userId, type, x, y, width, height, data)
        VALUES (:id, :userId, :type, :x, :y, :width, :height, :data)
        """
        ),
        // language=sql
        UPDATE_DATA(
                """
                    UPDATE userWidgets SET data = :data
                    WHERE id = :id
                    """
        );

        private String sql;

        Statements(String sql) {
            this.sql = sql;
        }
    }
}
