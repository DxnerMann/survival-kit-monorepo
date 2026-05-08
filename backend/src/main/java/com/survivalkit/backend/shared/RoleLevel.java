package com.survivalkit.backend.shared;

public enum RoleLevel {
    GUEST,
    USER,
    ADMIN;

    public boolean hasAtLeast(RoleLevel required) {
        return this.ordinal() >= required.ordinal();
    }
}
