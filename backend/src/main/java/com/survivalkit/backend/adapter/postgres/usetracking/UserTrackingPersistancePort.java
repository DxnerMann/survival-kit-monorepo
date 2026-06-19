package com.survivalkit.backend.adapter.postgres.usetracking;

import com.survivalkit.backend.shared.Page;

import java.util.Optional;

public interface UserTrackingPersistancePort {

    void saveTrackAction(TrackAction action);
    Page<TrackAction> getUserActionsLast7Days(String userId, TrackAction.Action actionType, String continuation);
    Page<TrackAction> getCourseActionsLast7Days(String course, TrackAction.Action actionType, String continuation);
    Page<TrackAction> getGlobalActionsLast7Days(TrackAction.Action actionType, String continuation);
    Optional<Integer> getActionSumForUser(String userId, TrackAction.Action target);
    Optional<Integer> getActionSumForCourse(String course, TrackAction.Action target);
    Optional<Integer> getGolbalActionSum(TrackAction.Action target);
}
