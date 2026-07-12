package com.survivalkit.backend.core.statistics;

import com.survivalkit.backend.adapter.postgres.user.UserPersistancePort;
import com.survivalkit.backend.adapter.postgres.usetracking.TrackAction;
import com.survivalkit.backend.adapter.postgres.usetracking.UserTrackingPersistancePort;
import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.context.SecurityContext;
import com.survivalkit.backend.shared.Page;
import io.viascom.nanoid.NanoId;
import org.springframework.stereotype.Service;

import java.time.Instant;

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

        String userId = null;
        try {
            var user = SecurityContext.current();
            userId = user.userId();
        } finally {
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
    }

    @Override
    public Page<TrackAction> getUserActions(TrackAction.Action actionType, String continuation) {

        var user = SecurityContext.current();
        return  userTrackingPersistancePort.getUserActionsLast7Days(user.userId(), actionType, continuation);
    }

    @Override
    public Page<TrackAction> getCourseActions(TrackAction.Action actionType, String continuation) {
        var authUser = SecurityContext.current();

        var user = userPersistancePort.getById(authUser.userId());
        if (user.isEmpty()) {
            throw new IllegalStateException(ErrorCode.USER_DOES_NOT_EXIST.getCode());
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
        return userTrackingPersistancePort.getActionSumForUser(user.userId(), target).orElse(0);
    }

    @Override
    public int getActionSumForCourse(TrackAction.Action target) {
        var authUser = SecurityContext.current();
        var user = userPersistancePort.getById(authUser.userId());
        if (user.isEmpty()) {
            throw new IllegalStateException(ErrorCode.USER_DOES_NOT_EXIST.getCode());
        }
        return userTrackingPersistancePort.getActionSumForCourse(user.get().course(), target).orElse(0);
    }

    @Override
    public int getGolbalActionSum(TrackAction.Action target) {
        return userTrackingPersistancePort.getGolbalActionSum(target).orElse(0);
    }
}
