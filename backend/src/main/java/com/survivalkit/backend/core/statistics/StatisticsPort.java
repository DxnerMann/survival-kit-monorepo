package com.survivalkit.backend.core.statistics;

import com.survivalkit.backend.adapter.postgres.usetracking.TrackAction;
import com.survivalkit.backend.shared.Page;

public interface StatisticsPort {

    void saveTrackAction(TrackAction.Action action, String userId, String course);
    Page<TrackAction> getUserActions(String userId, TrackAction.Action actionType, String continuation);
    Page<TrackAction> getCourseActions(String course, TrackAction.Action actionType, String continuation);
    Page<TrackAction> getGlobalActions(TrackAction.Action actionType, String continuation);
    int getActionSumForUser(String userId, TrackAction.Action target);
    int getActionSumForCourse(String course, TrackAction.Action target);
    int getGolbalActionSum(TrackAction.Action target);
}
