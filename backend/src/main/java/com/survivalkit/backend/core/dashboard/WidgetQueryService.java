package com.survivalkit.backend.core.dashboard;

import com.survivalkit.backend.adapter.postgres.widget.UserWidgetModel;
import com.survivalkit.backend.adapter.postgres.widget.UserWidgetPersistancePort;
import com.survivalkit.backend.config.SecurityContext;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class WidgetQueryService implements WidgetQueryPort {

    private final UserWidgetPersistancePort userWidgetPersistancePort;

    public WidgetQueryService(UserWidgetPersistancePort userWidgetPersistancePort) {
        this.userWidgetPersistancePort = userWidgetPersistancePort;
    }

    @Override
    public List<UserWidgetModel> getAllWidgets() {
        var userId = SecurityContext.current().userId();
        return userWidgetPersistancePort.getAllForUser(userId);
    }

    @Override
    public void saveAllWidgets(List<UserWidgetModel> widgetModels) {
        var userId = SecurityContext.current().userId();
        userWidgetPersistancePort.overrideAll(widgetModels, userId);
    }

    @Override
    public void updateWidgetData(String id, String data) {
        userWidgetPersistancePort.saveDataForWidget(id, data);
    }
}
