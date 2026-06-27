package com.survivalkit.backend.core.statistics;

import com.survivalkit.backend.adapter.postgres.course.CoursePersistancePort;
import com.survivalkit.backend.adapter.postgres.user.UserModel;
import com.survivalkit.backend.adapter.postgres.user.UserPersistancePort;
import com.survivalkit.backend.adapter.postgres.usetracking.TrackAction;
import com.survivalkit.backend.adapter.postgres.usetracking.UserTrackingPersistancePort;
import com.survivalkit.backend.config.SecurityContext;
import com.survivalkit.backend.core.auth.AuthenticatedUser;
import com.survivalkit.backend.shared.Page;
import io.viascom.nanoid.NanoId;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

@Service
public class StatisticsService implements StatisticsPort {

    private final UserTrackingPersistancePort userTrackingPersistancePort;
    private final UserPersistancePort userPersistancePort;

    public StatisticsService(UserTrackingPersistancePort userTrackingPersistancePort, UserPersistancePort userPersistancePort) {
        this.userTrackingPersistancePort = userTrackingPersistancePort;
		this.userPersistancePort = userPersistancePort;
    }

    @Override
    public void saveTrackAction(TrackAction.Action action) {

        var authUser = SecurityContext.current();

        var userId = authUser.map(AuthenticatedUser::userId).orElse(null);

        String course = null;
        if (userId != null) {
            var user = userPersistancePort.getById(userId);
            course = user.map(UserModel::course).orElse(null);
        }

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
