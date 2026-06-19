package com.survivalkit.backend.adapter.postgres.course;

import com.survivalkit.backend.adapter.postgres.logs.Log;
import com.survivalkit.backend.core.security.SecurityLog;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class CourseRepository implements CoursePersistancePort {

    private final JdbcClient jdbcClient;
    private final SecurityLog securityLog;

    public CourseRepository(JdbcClient jdbcClient, SecurityLog securityLog) {
        this.jdbcClient = jdbcClient;
        this.securityLog = securityLog;
    }

    @Override
    public void save(String course, String raplaBaseUrl) {
        jdbcClient.sql(Statements.SAVE.sql)
                .paramSource(new MapSqlParameterSource("course", course)
                        .addValue("raplaBaseUrl", raplaBaseUrl))
                .update();
        securityLog.logInfo(Log.SecurityLogSubType.DATABASE, String.format("New Course %s with Url %s saved.", course, raplaBaseUrl));
    }

    @Override
    public Optional<String> getRaplaUrl(String course) {
        return jdbcClient.sql(Statements.GET_URL.sql)
                .paramSource(new MapSqlParameterSource("course", course))
                .query(String.class)
                .optional();
    }

    @Override
    public List<String> getAvailableCourses() {
        return jdbcClient.sql(Statements.GET_ALL_COURSES.sql)
                .query(String.class)
                .list();
    }

    private enum Statements {
        // language=sql
        SAVE(
                """
                    INSERT INTO courses (course, raplaBaseUrl)
                    VALUES (:course, :raplaBaseUrl)
                    ON CONFLICT (course)
                    DO NOTHING
                    """
        ),
        // language=sql
        GET_URL(
                """
                    SELECT raplaBaseUrl FROM courses WHERE course = :course
                    """
        ),
        // language=sql
        GET_ALL_COURSES(
                """
                    SELECT course FROM courses
                    """
        );

        private String sql;

        Statements(String sql) {
            this.sql = sql;
        }
    }
}
