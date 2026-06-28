package com.survivalkit.backend.core.statistics;

import com.survivalkit.backend.adapter.postgres.usetracking.TrackAction;
import com.survivalkit.backend.shared.Page;

import java.util.Map;

public interface StatisticsPort {

    void saveTrackAction(TrackAction.Action action);
    Page<TrackAction> getUserActions(TrackAction.Action actionType, String continuation);
    Page<TrackAction> getCourseActions(TrackAction.Action actionType, String continuation);
    Page<TrackAction> getGlobalActions(TrackAction.Action actionType, String continuation);
    int getActionSumForUser(TrackAction.Action target);
    int getActionSumForCourse(TrackAction.Action target);
    int getGolbalActionSum(TrackAction.Action target);
}
