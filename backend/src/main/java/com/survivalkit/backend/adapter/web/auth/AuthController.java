package com.survivalkit.backend.adapter.web.auth;

import com.survivalkit.backend.core.auth.AuthPort;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

@RestController
@RequestMapping("api/v1/auth")
public class AuthController {

    private final AuthPort authPort;

    public AuthController(AuthPort authPort) {
        this.authPort = authPort;
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
            @RequestBody LoginRequest loginRequest
    ) {
        return ResponseEntity.ok(authPort.login(loginRequest.email(), loginRequest.password()));
    }

    @Role(RoleLevel.USER)
    @PostMapping("validate")
    public ResponseEntity<LoginResponse> validate() {

        authPort.validate();
        return ResponseEntity.ok().build();
    }
}
