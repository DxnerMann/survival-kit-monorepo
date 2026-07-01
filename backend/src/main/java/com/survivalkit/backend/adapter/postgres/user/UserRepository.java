package com.survivalkit.backend.adapter.postgres.user;

import com.survivalkit.backend.adapter.postgres.logs.Log;
import com.survivalkit.backend.adapter.web.profile.UserProfile;
import com.survivalkit.backend.core.security.SecurityLog;
import com.survivalkit.backend.shared.RoleLevel;
import com.survivalkit.backend.shared.Utils;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

import static com.survivalkit.backend.shared.Utils.toInstant;

@Repository
public class UserRepository implements UserPersistancePort {

    private final JdbcClient jdbcClient;
    private final SecurityLog securityLog;

    public UserRepository(JdbcClient jdbcClient, SecurityLog securityLog) {
        this.jdbcClient = jdbcClient;
        this.securityLog = securityLog;
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
                        .addValue("color", user.color())
                        .addValue("img", user.img().img())
                        .addValue("imgType", user.img().imgType().toString())
                ).update();
        securityLog.logInfo(Log.SecurityLogSubType.DATABASE, String.format("User created with id %s", user.id()));
    }

    @Override
    public Optional<UserModel> getById(String id) {
        return jdbcClient.sql(Statements.GET_BY_ID.sql)
                .paramSource(new MapSqlParameterSource("id", id))
                .query(USER_ROW_MAPPER)
                .optional();
    }

    @Override
    public Optional<UserModel> findByEmailOrUsername(String email, String username) {
        return jdbcClient.sql(Statements.GET_BY_MAIL_OR_USERNAME.sql)
                .paramSource(new MapSqlParameterSource("email", email)
                        .addValue("username", username))
                .query(USER_ROW_MAPPER)
                .optional();
    }

    @Override
    public void setVerified(String userId, boolean verified) {
        jdbcClient.sql(Statements.VERIFY.sql)
                .paramSource(new MapSqlParameterSource("id", userId)
                        .addValue("isVerified", verified)
                ).update();
        securityLog.logInfo(Log.SecurityLogSubType.DATABASE, String.format("User with id %s was verified", userId));
    }

    @Override
    public void setUserCourse(String userId, String course) {
        jdbcClient.sql(Statements.SET_COURSE.sql)
                .paramSource(new MapSqlParameterSource("id", userId)
                        .addValue("course", course)
                ).update();
        securityLog.logInfo(Log.SecurityLogSubType.DATABASE, String.format("User-Course changed for user with id %s", userId));
    }

    @Override
    public Optional<UserProfile> getUserProfile(String userId) {
        return jdbcClient.sql(Statements.USER_PROFILE.sql)
                .paramSource(new MapSqlParameterSource("id", userId))
                .query(UserProfile.class)
                .optional();
    }

    @Override
    public void updateProfilePicture(ImgWrapper wrapper, String userId) {
        jdbcClient.sql(Statements.UPDATE_PROFILE_IMG.sql)
                .paramSource(new MapSqlParameterSource("img", wrapper.img())
                        .addValue("imgType", wrapper.imgType().toString())
                        .addValue("id", userId)
                ).update();
    }

    @Override
    public Optional<ImgWrapper> getProfilePicture(String userId) {
        return jdbcClient.sql(Statements.GET_IMG.sql)
                .paramSource(new MapSqlParameterSource("id", userId))
                .query(ImgWrapper.class).optional();
    }

    @Override
    public void updateProfileColor(String userId, String color) {
        jdbcClient.sql(Statements.UPDATE_COLOR.sql)
                .paramSource(new MapSqlParameterSource("color", color)
                        .addValue("id", userId)
                ).update();
    }

    private static final RowMapper<UserModel> USER_ROW_MAPPER = (rs, rowNum) -> {
        byte[] imgBytes = rs.getBytes("img");
        String imgTypeRaw = rs.getString("imgType");

        ImgWrapper img = imgBytes != null && imgTypeRaw != null
                ? new ImgWrapper(imgBytes, ImgWrapper.ProfileImgType.valueOf(imgTypeRaw))
                : null;

        return new UserModel(
                rs.getString("id"),
                rs.getString("firstname"),
                rs.getString("lastname"),
                rs.getString("username"),
                rs.getString("email"),
                rs.getString("password"),
                RoleLevel.valueOf(rs.getString("role")),
                rs.getString("verificationToken"),
                rs.getBoolean("isVerified"),
                rs.getString("course"),
                rs.getString("color"),
                img,
                toInstant(rs.getTimestamp("lastUpdated"))
        );
    };

    private enum Statements{
        // language=sql
        UPSERT(
        """
                INSERT INTO users (id, firstname, lastname, username, email, password, role, verificationToken, isVerified, course, createdat, lastupdated, color, img, imgType)
                VALUES (:id, :firstname, :lastname, :username, :email, :password, :role, :verificationToken, :isVerified, :course, :currentTime, :currentTime, :color, :img, :imgType)
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
        ),
        // language=sql
        USER_PROFILE(
        """
                SELECT firstname, lastname, course, role, email, username, color, id as userId FROM users WHERE id = :id;
            """
        ),
        // language=sql
        UPDATE_PROFILE_IMG(
        """
                UPDATE users SET img = :img, imgType = :imgType WHERE id = :id;
            """
        ),
        // language=sql
        GET_IMG(
        """
                SELECT img, imgType FROM users WHERE id = :id;
            """
        ),
        // language=sql
        UPDATE_COLOR(
        """
                UPDATE users SET color = :color WHERE id = :id 
            """
        );

        private String sql;

        Statements(String sql) {
            this.sql = sql;
        }
    }
}
