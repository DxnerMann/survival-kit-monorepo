package com.survivalkit.backend.core.guest;

import com.survivalkit.backend.adapter.postgres.guest.Guest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.util.List;

public interface GuestPort {
    void touch(HttpServletRequest request, HttpServletResponse response);

    void retire(HttpServletRequest request, HttpServletResponse response);

    List<Guest> activeGuests();
}
