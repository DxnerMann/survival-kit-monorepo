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
    static final String FEEDBACK_RESOLVED = "FEEDBACK_RESOLVED";
    static final String FEEDBACK_LIKED = "FEEDBACK_LIKED";
    static final String ROLE_CHANGED = "ROLE_CHANGED";
    static final String RANK_UP = "RANK_UP";
    static final String EVENT_INVITED = "EVENT_INVITED";
    static final String EVENT_INVITE_ACCEPTED = "EVENT_INVITE_ACCEPTED";
    static final String EVENT_INVITE_DECLINED = "EVENT_INVITE_DECLINED";
    static final String EVENT_RESPONSE_ACCEPTED = "EVENT_RESPONSE_ACCEPTED";
    static final String EVENT_RESPONSE_DECLINED = "EVENT_RESPONSE_DECLINED";

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
    public UserActivity recordFeedbackResolved(String userId, String title, String actorUsername, String feedbackId) {
        return record(userId, FEEDBACK_RESOLVED, title, actorUsername, feedbackId);
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
    public UserActivity recordRankUp(String userId, String rankLabel) {
        return record(userId, RANK_UP, rankLabel, null, null);
    }

    @Override
    public UserActivity recordEventInvited(String userId, String title, String actorUsername, String eventId) {
        return record(userId, EVENT_INVITED, title, actorUsername, eventId);
    }

    @Override
    public UserActivity recordEventGuestResponse(String userId, String title, String actorUsername, String eventId, boolean accepted) {
        return record(
                userId,
                accepted ? EVENT_RESPONSE_ACCEPTED : EVENT_RESPONSE_DECLINED,
                title,
                actorUsername,
                eventId
        );
    }

    @Override
    public void markEventInvite(String activityId, String userId, boolean accepted) {
        if (activityId == null || activityId.isBlank() || userId == null || userId.isBlank()) {
            return;
        }
        userActivityPersistancePort.updateKind(
                activityId,
                userId,
                accepted ? EVENT_INVITE_ACCEPTED : EVENT_INVITE_DECLINED
        );
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
