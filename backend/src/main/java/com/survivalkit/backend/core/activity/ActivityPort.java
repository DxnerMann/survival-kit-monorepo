package com.survivalkit.backend.core.activity;

import com.survivalkit.backend.adapter.postgres.activity.UserActivity;

import java.util.List;

public interface ActivityPort {

    UserActivity recordMemeDeleted(String userId, String title, String actorUsername);

    UserActivity recordMemeLiked(String userId, String title, String actorUsername);

    UserActivity recordFeedbackDeleted(String userId, String title, String actorUsername);
    UserActivity recordFeedbackResolved(String userId, String title, String actorUsername, String feedbackId);

    UserActivity recordFeedbackLiked(String userId, String title, String actorUsername, String feedbackId);

    UserActivity recordRoleChanged(String userId, String role, String actorUsername);

    UserActivity recordRankUp(String userId, String rankLabel);

    UserActivity recordEventInvited(String userId, String title, String actorUsername, String eventId);

    void markEventInvite(String activityId, String userId, boolean accepted);

    List<UserActivity> listMine();
}
