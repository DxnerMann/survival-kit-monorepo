package com.survivalkit.backend.adapter.postgres.guest;

import java.util.List;

public interface GuestPersistancePort {
    void touch(String id);

    void delete(String id);

    void deleteInactive();

    List<Guest> findActive();
}
