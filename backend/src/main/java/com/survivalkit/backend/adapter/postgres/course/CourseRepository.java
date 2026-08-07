package com.survivalkit.backend.adapter.postgres.course;

import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.core.security.SecurityLog;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    public void saveRaplaUrl(String course, String raplaBaseUrl, String raplaVersion) {
        jdbcClient.sql(Statements.SAVE.sql)
                .paramSource(new MapSqlParameterSource("course", course)
                        .addValue("version", raplaVersion)
                        .addValue("url", raplaBaseUrl))
                .update();

        securityLog.logInfo(
                ErrorCode.ErrorCategory.COURSE,
                String.format("Course %s saved with Rapla %s URL %s.", course, raplaVersion, raplaBaseUrl)
        );
    }

    @Override
    public Optional<CourseRaplaConfig> getCourseRaplaConfig(String course) {
        var urls = jdbcClient.sql(Statements.GET_URLS.sql)
                .paramSource(new MapSqlParameterSource("course", course))
                .query((rs, rowNum) -> Map.entry(
                        rs.getString("version"),
                        rs.getString("url")
                ))
                .list();

        if (urls.isEmpty()) {
            return Optional.empty();
        }

        var urlsByVersion = new HashMap<String, String>();
        urls.forEach(entry -> urlsByVersion.put(entry.getKey(), entry.getValue()));

        return Optional.of(new CourseRaplaConfig(course, Map.copyOf(urlsByVersion)));
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
                    INSERT INTO courses (course, version, url)
                    VALUES (:course, :version, :url)
                    ON CONFLICT (course, version)
                    DO UPDATE SET url = EXCLUDED.url
                    """
        ),
        // language=sql
        GET_URLS(
                """
                    SELECT version, url
                    FROM courses
                    WHERE course = :course
                    """
        ),
        // language=sql
        GET_ALL_COURSES(
                """
                    SELECT DISTINCT course FROM courses
                    """
        );

        private final String sql;

        Statements(String sql) {
            this.sql = sql;
        }
    }
}
