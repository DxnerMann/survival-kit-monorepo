package com.survivalkit.backend.adapter.postgres.widget;

import java.util.List;

public interface UserWidgetPersistancePort {

    List<UserWidgetModel> getAllForUser(String userId);
    void overrideAll(List<UserWidgetModel> userWidgets, String userId);
    void saveDataForWidget(String id, String data);
}
