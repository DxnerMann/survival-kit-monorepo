package com.survivalkit.backend.adapter.postgres.user;

import java.util.Optional;

public interface UserPersistancePort {

    void save(UserModel user);
    Optional<UserModel> getById(String id);
    Optional<UserModel> findByEmailOrUsername(String email, String username);
    void setVerified(String userId, boolean verified);
    void setUserCourse(String userId, String course);
}
