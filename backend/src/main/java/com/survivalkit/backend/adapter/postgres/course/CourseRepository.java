package com.survivalkit.backend.adapter.postgres.course;

import com.survivalkit.backend.adapter.web.ErrorCode;
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
    public void saveRaplaUrl(String course, String raplaBaseUrl) {
        jdbcClient.sql(Statements.SAVE.sql)
                .paramSource(new MapSqlParameterSource("course", course)
                        .addValue("url", raplaBaseUrl))
                .update();

        securityLog.logInfo(
                ErrorCode.ErrorCategory.COURSE,
                String.format("Course %s saved with Rapla URL %s.", course, raplaBaseUrl)
        );
    }

    @Override
    public Optional<CourseRaplaConfig> getCourseRaplaConfig(String course) {
        return jdbcClient.sql(Statements.GET_URL.sql)
                .paramSource(new MapSqlParameterSource("course", course))
                .query((rs, rowNum) -> new CourseRaplaConfig(course, rs.getString("url")))
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
                    INSERT INTO courses (course, url)
                    VALUES (:course, :url)
                    ON CONFLICT (course)
                    DO UPDATE SET url = EXCLUDED.url
                    """
        ),
        // language=sql
        GET_URL(
                """
                    SELECT url
                    FROM courses
                    WHERE course = :course
                    """
        ),
        // language=sql
        GET_ALL_COURSES(
                """
                    SELECT course FROM courses
                    """
        );

        private final String sql;

        Statements(String sql) {
            this.sql = sql;
        }
    }
}
