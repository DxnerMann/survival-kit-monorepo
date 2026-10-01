package com.survivalkit.backend.core.guest;

import com.survivalkit.backend.adapter.postgres.guest.Guest;
import com.survivalkit.backend.adapter.postgres.guest.GuestPersistancePort;
import com.survivalkit.backend.context.SecurityContext;
import com.survivalkit.backend.core.security.GuestCookieService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class GuestService implements GuestPort {

    private final GuestPersistancePort guestPersistancePort;
    private final GuestCookieService guestCookieService;

    public GuestService(GuestPersistancePort guestPersistancePort, GuestCookieService guestCookieService) {
        this.guestPersistancePort = guestPersistancePort;
        this.guestCookieService = guestCookieService;
    }

    @Override
    public void touch(HttpServletRequest request, HttpServletResponse response) {
        if (SecurityContext.currentOptional().isPresent()) {
            retire(request, response);
            return;
        }

        var guestId = guestCookieService.readGuestId(request);
        if (guestId == null) {
            guestId = UUID.randomUUID().toString();
        }
        guestPersistancePort.touch(guestId);
        guestCookieService.setGuestCookie(request, response, guestId);
    }

    @Override
    public void retire(HttpServletRequest request, HttpServletResponse response) {
        var guestId = guestCookieService.readGuestId(request);
        if (guestId != null) {
            guestPersistancePort.delete(guestId);
        }
        guestCookieService.clearGuestCookie(request, response);
    }

    @Override
    public List<Guest> activeGuests() {
        return guestPersistancePort.findActive();
    }
}
