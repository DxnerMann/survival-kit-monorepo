package com.survivalkit.backend.core.statistics;

import com.survivalkit.backend.adapter.postgres.usetracking.UserTrackingPersistancePort;
import org.springframework.scheduling.annotation.Scheduled;

public class UserTrackingClearanceScheduler {

	private final UserTrackingPersistancePort userTrackingPersistancePort;

	public UserTrackingClearanceScheduler(UserTrackingPersistancePort userTrackingPersistancePort) {
		this.userTrackingPersistancePort = userTrackingPersistancePort;
	}

	@Scheduled(cron = "0 0 * * * *")
	public void cleanup() {
		userTrackingPersistancePort.deleteOlderThanOneMonth();
	}

}
