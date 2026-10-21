package com.survivalkit.backend.core.activity;

import com.survivalkit.backend.adapter.postgres.activity.UserActivity;

import java.util.List;

public interface ActivityPort {

    UserActivity recordMemeDeleted(String userId, String title, String actorUsername);

    UserActivity recordMemeLiked(String userId, String title, String actorUsername);

    List<UserActivity> listMine();
}
