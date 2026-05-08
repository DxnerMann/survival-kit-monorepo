package com.survivalkit.backend.core.email;

public interface EmailPort {

    void sendVerificationEmail(String mail, String name, String token);
}
