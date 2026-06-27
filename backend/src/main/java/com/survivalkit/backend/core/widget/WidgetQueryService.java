package com.survivalkit.backend.core.widget;

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
        var user = SecurityContext.current();

        if (user.isEmpty()) {
            throw new IllegalStateException(
                    "No authenticated user in context. " +
                            "Ensure this is called within a secured request.");
        }

        var userWidgets = userWidgetPersistancePort.getAllForUser(user.get().userId());
        if (userWidgets.isEmpty()) {
            throw new NoWidgetsFoundException("No widgets found for user: " + user.get().userId());
        }
        return userWidgets;
    }

    @Override
    public void saveAllWidgets(List<UserWidgetModel> widgetModels) {
        var user = SecurityContext.current();

        if (user.isEmpty()) {
            throw new IllegalStateException(
                    "No authenticated user in context. " +
                            "Ensure this is called within a secured request.");
        }

        userWidgetPersistancePort.overrideAll(widgetModels, user.get().userId());
    }

    @Override
    public void updateWidgetData(String id, String data) {
        userWidgetPersistancePort.saveDataForWidget(id, data);
    }
}
