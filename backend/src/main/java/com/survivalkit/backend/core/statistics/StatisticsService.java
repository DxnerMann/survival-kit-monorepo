package com.survivalkit.backend.core.statistics;

import com.survivalkit.backend.adapter.postgres.usetracking.TrackAction;
import com.survivalkit.backend.adapter.postgres.usetracking.UserTrackingPersistancePort;
import com.survivalkit.backend.shared.Page;
import io.viascom.nanoid.NanoId;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class StatisticsService implements StatisticsPort {

    private final UserTrackingPersistancePort userTrackingPersistancePort;

    public StatisticsService(UserTrackingPersistancePort userTrackingPersistancePort) {
        this.userTrackingPersistancePort = userTrackingPersistancePort;
    }

    @Override
    public void saveTrackAction(TrackAction.Action action, String userId, String course) {
        userTrackingPersistancePort.saveTrackAction(
                new TrackAction(
                        NanoId.generate(25),
                        action,
                        userId,
                        course,
                        Instant.now()
                )
        );
    }

    @Override
    public Page<TrackAction> getUserActions(String userId, TrackAction.Action actionType, String continuation) {
       return  userTrackingPersistancePort.getUserActionsLast7Days(userId, actionType, continuation);
    }

    @Override
    public Page<TrackAction> getCourseActions(String course, TrackAction.Action actionType, String continuation) {
        return userTrackingPersistancePort.getCourseActionsLast7Days(course, actionType, continuation);
    }

    @Override
    public Page<TrackAction> getGlobalActions(TrackAction.Action actionType, String continuation) {
        return userTrackingPersistancePort.getGlobalActionsLast7Days(actionType, continuation);
    }

    @Override
    public int getActionSumForUser(String userId, TrackAction.Action target) {
        return userTrackingPersistancePort.getActionSumForUser(userId, target).orElse(0);
    }

    @Override
    public int getActionSumForCourse(String course, TrackAction.Action target) {
        return userTrackingPersistancePort.getActionSumForCourse(course, target).orElse(0);
    }

    @Override
    public int getGolbalActionSum(TrackAction.Action target) {
        return userTrackingPersistancePort.getGolbalActionSum(target).orElse(0);
    }

}
