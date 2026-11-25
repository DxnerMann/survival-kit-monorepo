package com.survivalkit.backend.adapter.postgres.activity;

import java.util.List;

public interface UserActivityPersistancePort {

    void save(UserActivity activity);

    void updateKind(String id, String userId, String kind);

    List<UserActivity> findByUser(String userId);
}
