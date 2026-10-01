package com.survivalkit.backend.adapter.web.guest;

import com.survivalkit.backend.core.guest.GuestPort;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("v1/guests")
public class GuestController {

    private final GuestPort guestPort;

    public GuestController(GuestPort guestPort) {
        this.guestPort = guestPort;
    }

    @Role(RoleLevel.GUEST)
    @PostMapping("presence")
    public ResponseEntity<Void> presence(HttpServletRequest request, HttpServletResponse response) {
        guestPort.touch(request, response);
        return ResponseEntity.ok().build();
    }
}
