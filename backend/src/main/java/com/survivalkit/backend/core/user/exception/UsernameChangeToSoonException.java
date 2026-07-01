package com.survivalkit.backend.core.user.exception;

public class UsernameChangeToSoonException extends RuntimeException {
	public UsernameChangeToSoonException(long daysLeft) {
		super(String.format("Username can only be changed again in %s days.t", daysLeft));
	}
}
