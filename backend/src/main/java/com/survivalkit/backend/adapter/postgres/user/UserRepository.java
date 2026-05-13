package com.survivalkit.backend.adapter.postgres.user;

import com.survivalkit.backend.shared.Utils;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public class UserRepository implements UserPersistancePort {

    private final JdbcClient jdbcClient;

    public UserRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public void save(UserModel user) {
        jdbcClient.sql(Statements.UPSERT.sql)
                .paramSource(new MapSqlParameterSource("id", user.id())
                        .addValue("firstname", user.firstname())
                        .addValue("lastname", user.lastname())
                        .addValue("username", user.username())
                        .addValue("email", user.email())
                        .addValue("password", user.password())
                        .addValue("role", user.role().toString())
                        .addValue("verificationToken", user.verificationToken())
                        .addValue("isVerified", user.isVerified())
                        .addValue("course", user.course())
                        .addValue("currentTime", Utils.toTimestamp(Instant.now()))
                ).update();
    }

    @Override
    public Optional<UserModel> getById(String id) {
        return jdbcClient.sql(Statements.GET_BY_ID.sql)
                .paramSource(new MapSqlParameterSource("id", id))
                .query(UserModel.class)
                .optional();
    }

    @Override
    public Optional<UserModel> findByEmailOrUsername(String email, String username) {
        return jdbcClient.sql(Statements.GET_BY_MAIL_OR_USERNAME.sql)
                .paramSource(new MapSqlParameterSource("email", email)
                        .addValue("username", username))
                .query(UserModel.class)
                .optional();
    }

    @Override
    public void setVerified(String userId, boolean verified) {
        jdbcClient.sql(Statements.VERIFY.sql)
                .paramSource(new MapSqlParameterSource("id", userId)
                        .addValue("isVerified", verified)
                ).update();
    }

    @Override
    public void setUserCourse(String userId, String course) {
        jdbcClient.sql(Statements.SET_COURSE.sql)
                .paramSource(new MapSqlParameterSource("id", userId)
                        .addValue("course", course)
                ).update();
    }

    private enum Statements{
        // language=sql
        UPSERT(
        """
                INSERT INTO users (id, firstname, lastname, username, email, password, role, verificationToken, isVerified, course, createdat, lastupdated)
                VALUES (:id, :firstname, :lastname, :username, :email, :password, :role, :verificationToken, :isVerified, :course, :currentTime, :currentTime)
                ON CONFLICT (id)
                DO UPDATE SET
                    firstname   = :firstname,
                    lastname    = :lastname,
                    username    = :username,
                    password    = :password,
                    isVerified  = :isVerified,
                    course      = :course,
                    lastupdated = :currentTime
             """
        ),
        // language=sql
        GET_BY_ID(
        """
                SELECT * FROM users WHERE id = :id
            """
        ),
        // language=sql
        GET_BY_MAIL_OR_USERNAME(
        """
                SELECT * FROM users WHERE username = :username OR email = :email LIMIT 1;
            """
        ),
        // language=sql
        VERIFY(
                """
                        UPDATE users SET isVerified = :isVerified WHERE id = :id;
                    """
        ),
        // language=sql
        SET_COURSE(
                """
                        UPDATE users SET course = :course WHERE id = :id;
                    """
        );

        private String sql;

        Statements(String sql) {
            this.sql = sql;
        }
    }
}
