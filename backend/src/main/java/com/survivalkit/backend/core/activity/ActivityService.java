package com.survivalkit.backend.core.activity;

import com.survivalkit.backend.adapter.postgres.activity.UserActivity;
import com.survivalkit.backend.adapter.postgres.activity.UserActivityPersistancePort;
import com.survivalkit.backend.context.SecurityContext;
import io.viascom.nanoid.NanoId;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class ActivityService implements ActivityPort {

    static final String MEME_DELETED = "MEME_DELETED";
    static final String MEME_LIKED = "MEME_LIKED";

    private final UserActivityPersistancePort userActivityPersistancePort;

    public ActivityService(UserActivityPersistancePort userActivityPersistancePort) {
        this.userActivityPersistancePort = userActivityPersistancePort;
    }

    @Override
    public UserActivity recordMemeDeleted(String userId, String title, String actorUsername) {
        var actor = actorUsername == null ? "" : actorUsername.strip();
        var activity = new UserActivity(
                NanoId.generate(25),
                userId,
                MEME_DELETED,
                title == null ? "" : title.strip(),
                actor.isEmpty() ? null : actor,
                Instant.now()
        );
        userActivityPersistancePort.save(activity);
        return activity;
    }

    @Override
    public UserActivity recordMemeLiked(String userId, String title, String actorUsername) {
        var actor = actorUsername == null ? "" : actorUsername.strip();
        var activity = new UserActivity(
                NanoId.generate(25),
                userId,
                MEME_LIKED,
                title == null ? "" : title.strip(),
                actor.isEmpty() ? null : actor,
                Instant.now()
        );
        userActivityPersistancePort.save(activity);
        return activity;
    }

    @Override
    public List<UserActivity> listMine() {
        var user = SecurityContext.current();
        return userActivityPersistancePort.findByUser(user.userId());
    }
}
