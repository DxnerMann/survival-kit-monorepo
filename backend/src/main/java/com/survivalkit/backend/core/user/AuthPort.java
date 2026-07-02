package com.survivalkit.backend.core.user;

import com.survivalkit.backend.adapter.web.auth.LoginResponse;
import com.survivalkit.backend.adapter.web.auth.RegisterRequest;
import org.springframework.web.servlet.ModelAndView;

public interface AuthPort {
    void register(RegisterRequest request);
    ModelAndView verify(String token);
    LoginResponse login(String email, String password);
    LoginResponse validate();
    LoginResponse changePassword(String oldPassword, String newPassword);
    void logout();
}
