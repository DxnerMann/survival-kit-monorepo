package com.survivalkit.backend.core.statistics;

import com.survivalkit.backend.adapter.postgres.course.CoursePersistancePort;
import com.survivalkit.backend.adapter.postgres.user.UserModel;
import com.survivalkit.backend.adapter.postgres.user.UserPersistancePort;
import com.survivalkit.backend.adapter.postgres.usetracking.TrackAction;
import com.survivalkit.backend.adapter.postgres.usetracking.UserTrackingPersistancePort;
import com.survivalkit.backend.config.SecurityContext;
import com.survivalkit.backend.core.auth.AuthenticatedUser;
import com.survivalkit.backend.core.course.CourseNotFoundException;
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

        var userId = SecurityContext.current().map(AuthenticatedUser::userId).orElse(null);

        userTrackingPersistancePort.saveTrackAction(
                new TrackAction(
                        NanoId.generate(25),
                        action,
                        userId,
                        null,
                        Instant.now()
                )
        );
    }

    @Override
    public Page<TrackAction> getUserActions(TrackAction.Action actionType, String continuation) {

        var user = SecurityContext.current();
        if (user.isEmpty()) {
            throw new IllegalStateException(
                    "No authenticated user in context. " +
                            "Ensure this is called within a secured request.");
        }
        return  userTrackingPersistancePort.getUserActionsLast7Days(user.get().userId(), actionType, continuation);
    }

    @Override
    public Page<TrackAction> getCourseActions(TrackAction.Action actionType, String continuation) {
        var authUser = SecurityContext.current();
        if (authUser.isEmpty()) {
            throw new IllegalStateException(
                    "No authenticated user in context. " +
                            "Ensure this is called within a secured request.");
        }
        var user = userPersistancePort.getById(authUser.get().userId());
        if (user.isEmpty()) {
            throw new IllegalStateException(String.format("User with id %s does not exist.", authUser.get().userId()));
        }
        return userTrackingPersistancePort.getCourseActionsLast7Days(user.get().course(), actionType, continuation);
    }

    @Override
    public Page<TrackAction> getGlobalActions(TrackAction.Action actionType, String continuation) {
        return userTrackingPersistancePort.getGlobalActionsLast7Days(actionType, continuation);
    }

    @Override
    public int getActionSumForUser(TrackAction.Action target) {
        var user = SecurityContext.current();
        if (user.isEmpty()) {
            throw new IllegalStateException(
                    "No authenticated user in context. " +
                            "Ensure this is called within a secured request.");
        }
        return userTrackingPersistancePort.getActionSumForUser(user.get().userId(), target).orElse(0);
    }

    @Override
    public int getActionSumForCourse(TrackAction.Action target) {
        var authUser = SecurityContext.current();
        if (authUser.isEmpty()) {
            throw new IllegalStateException(
                    "No authenticated user in context. " +
                            "Ensure this is called within a secured request.");
        }
        var user = userPersistancePort.getById(authUser.get().userId());
        if (user.isEmpty()) {
            throw new IllegalStateException(String.format("User with id %s does not exist.", authUser.get().userId()));
        }
        return userTrackingPersistancePort.getActionSumForCourse(user.get().course(), target).orElse(0);
    }

    @Override
    public int getGolbalActionSum(TrackAction.Action target) {
        return userTrackingPersistancePort.getGolbalActionSum(target).orElse(0);
    }
}
