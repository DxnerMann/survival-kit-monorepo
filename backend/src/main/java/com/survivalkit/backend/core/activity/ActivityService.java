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
    static final String FEEDBACK_DELETED = "FEEDBACK_DELETED";
    static final String FEEDBACK_LIKED = "FEEDBACK_LIKED";
    static final String ROLE_CHANGED = "ROLE_CHANGED";

    private final UserActivityPersistancePort userActivityPersistancePort;

    public ActivityService(UserActivityPersistancePort userActivityPersistancePort) {
        this.userActivityPersistancePort = userActivityPersistancePort;
    }

    @Override
    public UserActivity recordMemeDeleted(String userId, String title, String actorUsername) {
        return record(userId, MEME_DELETED, title, actorUsername, null);
    }

    @Override
    public UserActivity recordMemeLiked(String userId, String title, String actorUsername) {
        return record(userId, MEME_LIKED, title, actorUsername, null);
    }

    @Override
    public UserActivity recordFeedbackDeleted(String userId, String title, String actorUsername) {
        return record(userId, FEEDBACK_DELETED, title, actorUsername, null);
    }

    @Override
    public UserActivity recordFeedbackLiked(String userId, String title, String actorUsername, String feedbackId) {
        return record(userId, FEEDBACK_LIKED, title, actorUsername, feedbackId);
    }

    @Override
    public UserActivity recordRoleChanged(String userId, String role, String actorUsername) {
        return record(userId, ROLE_CHANGED, role, actorUsername, null);
    }

    @Override
    public List<UserActivity> listMine() {
        var user = SecurityContext.current();
        return userActivityPersistancePort.findByUser(user.userId());
    }

    private UserActivity record(String userId, String kind, String title, String actorUsername, String subjectId) {
        var actor = actorUsername == null ? "" : actorUsername.strip();
        var subject = subjectId == null ? "" : subjectId.strip();
        var activity = new UserActivity(
                NanoId.generate(25),
                userId,
                kind,
                title == null ? "" : title.strip(),
                actor.isEmpty() ? null : actor,
                subject.isEmpty() ? null : subject,
                Instant.now()
        );
        userActivityPersistancePort.save(activity);
        return activity;
    }
}
