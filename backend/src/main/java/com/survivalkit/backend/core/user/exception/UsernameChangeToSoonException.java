package com.survivalkit.backend.core.user.exception;

public class UsernameChangeToSoonException extends RuntimeException {
	public UsernameChangeToSoonException(String code) {
		super(code);
	}
}
