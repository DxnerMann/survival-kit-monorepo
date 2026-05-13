package com.survivalkit.backend.core.dashboard;

import com.survivalkit.backend.adapter.postgres.widget.UserWidgetModel;

import java.util.List;

public interface WidgetQueryPort {

    List<UserWidgetModel> getAllWidgets();
    void saveAllWidgets(List<UserWidgetModel> widgetModels);
    void updateWidgetData(String id, String data);

}
