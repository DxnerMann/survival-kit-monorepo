package com.survivalkit.backend.adapter;

import com.survivalkit.backend.adapter.dto.in.RegisterRequest;
import com.survivalkit.backend.adapter.dto.out.RegisterResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("api/auth")
public class AuthController {

    @PostMapping("register")
    public ResponseEntity<RegisterResponse> register(
            @RequestBody RegisterRequest registerRequest
            ) {
        return ResponseEntity.badRequest().build();
    }
}
