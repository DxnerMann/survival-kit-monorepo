package com.survivalkit.backend.adapter.web.auth;

import com.survivalkit.backend.core.security.SessionCookieService;
import com.survivalkit.backend.core.user.AuthPort;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

@Tag(name = "Auth")
@RestController
@RequestMapping("v1/auth")
public class AuthController {

    private final AuthPort authPort;
    private final SessionCookieService sessionCookieService;

    public AuthController(AuthPort authPort, SessionCookieService sessionCookieService) {
        this.authPort = authPort;
        this.sessionCookieService = sessionCookieService;
    }

    @Role(RoleLevel.GUEST)
    @PostMapping("register")
    public ResponseEntity<Void> register(
        @RequestBody RegisterRequest registerRequest
    ) {
        authPort.register(registerRequest);
        return ResponseEntity.ok().build();
    }

    @Role(RoleLevel.GUEST)
    @GetMapping("/verify")
    public ModelAndView verify(@RequestParam String token) {
        return authPort.verify(token);
    }

    @Role(RoleLevel.GUEST)
    @PostMapping("login")
    public ResponseEntity<LoginResponse> login(
            @RequestBody LoginRequest loginRequest,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        var loginResponse = authPort.login(loginRequest.email(), loginRequest.password());
        sessionCookieService.setSessionCookie(request, response, loginResponse.token());
        return ResponseEntity.ok(loginResponse);
    }

    @Role(RoleLevel.USER)
    @PostMapping("validate")
    public ResponseEntity<LoginResponse> validate(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        var loginResponse = authPort.validate();
        sessionCookieService.setSessionCookie(request, response, loginResponse.token());
        return ResponseEntity.ok(loginResponse);
    }

    @Role(RoleLevel.USER)
    @PutMapping("password")
    public ResponseEntity<LoginResponse> changePassword(
            @RequestBody ChangePasswordRequest requestBody,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        var loginResponse = authPort.changePassword(requestBody.oldPassword(), requestBody.newPassword());
        sessionCookieService.setSessionCookie(request, response, loginResponse.token());
        return ResponseEntity.ok(loginResponse);
    }

    @Role(RoleLevel.USER)
    @PostMapping("logout")
    public ResponseEntity<Void> logout(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        authPort.logout();
        sessionCookieService.clearSessionCookie(request, response);
        return ResponseEntity.ok().build();
    }

    @Role(RoleLevel.USER)
    @DeleteMapping()
    public ResponseEntity<Void> deleteAccount(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        authPort.deleteAccount();
        sessionCookieService.clearSessionCookie(request, response);
        return ResponseEntity.ok().build();
    }

    @Role(RoleLevel.USER)
    @PutMapping("email")
    public ResponseEntity<Void> changeEmail(
            @RequestBody ChangeEmailRequest requestBody,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        authPort.changeEmail(requestBody.email());
        sessionCookieService.clearSessionCookie(request, response);
        return ResponseEntity.ok().build();
    }

    @Role(RoleLevel.USER)
    @PostMapping("resend")
    public ResponseEntity<Void> sendVerificationEmailAgain() {
        authPort.sendVerifcationEmailAgain();
        return ResponseEntity.ok().build();
    }
}
