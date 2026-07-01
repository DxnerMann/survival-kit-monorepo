package com.survivalkit.backend.core.widget;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.survivalkit.backend.adapter.postgres.user.UserPersistancePort;
import com.survivalkit.backend.adapter.postgres.widget.UserWidgetModel;
import com.survivalkit.backend.adapter.postgres.widget.UserWidgetPersistancePort;
import com.survivalkit.backend.config.SecurityContext;
import io.viascom.nanoid.NanoId;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class WidgetQueryService implements WidgetQueryPort {

    private final UserWidgetPersistancePort userWidgetPersistancePort;
    private final ObjectMapper objectMapper;
    private final UserPersistancePort userPersistancePort;

    public WidgetQueryService(UserWidgetPersistancePort userWidgetPersistancePort, ObjectMapper objectMapper, UserPersistancePort userPersistancePort) {
        this.userWidgetPersistancePort = userWidgetPersistancePort;
		this.objectMapper = objectMapper;
		this.userPersistancePort = userPersistancePort;
    }

    @Override
    public List<UserWidgetModel> getAllWidgets() {
        var user = SecurityContext.current();

        if (user.isEmpty()) {
            throw new IllegalStateException(
                    "No authenticated user in context. " +
                            "Ensure this is called within a secured request.");
        }
        var foundWidgets = userWidgetPersistancePort.getAllForUser(user.get().userId());

        if (foundWidgets.size() == 1 && foundWidgets.get(0).type() == UserWidgetModel.WidgetType.EMPTY_DASHBOARD) {
            return List.of();
        } else if (foundWidgets.isEmpty()) {
            var defaultLayout = getDefaultLayout();
            saveAllWidgets(defaultLayout);
            return defaultLayout;
        }
        return foundWidgets;
    }

    @Override
    public void saveAllWidgets(List<UserWidgetModel> widgetModels) {
        var user = SecurityContext.current();

        if (user.isEmpty()) {
            throw new IllegalStateException(
                    "No authenticated user in context. " +
                            "Ensure this is called within a secured request.");
        }

        if (widgetModels.isEmpty()) {
            widgetModels.add(new UserWidgetModel(
                    NanoId.generate(25),
                    UserWidgetModel.WidgetType.EMPTY_DASHBOARD,
                    0,
                    0,
                    0,
                    0,
                    ""
            ));
        }
        userWidgetPersistancePort.overrideAll(widgetModels, user.get().userId());
    }

    @Override
    public void updateWidgetData(String id, String data) {

        try {
            var root = objectMapper.readTree(data);
            if (root.has("course")) {
                var authUser = SecurityContext.current();
                if (authUser.isPresent() && !root.get("course").isNull()) {
                    var user = userPersistancePort.getById(authUser.get().userId());
                    if (user.isPresent() && user.get().course() == null) {
                        userPersistancePort.setUserCourse(authUser.get().userId(), root.get("course").asText());
                    }
                }
            }
        } catch (JsonProcessingException e) {
			throw new RuntimeException("Failed to Read Data");
		} finally {
            userWidgetPersistancePort.saveDataForWidget(id, data);
        }
    }

    private List<UserWidgetModel> getDefaultLayout() {
        return List.of(
                new UserWidgetModel(
                        NanoId.generate(25),
                        UserWidgetModel.WidgetType.LECTURE_PLAN,
                        0,
                        0,
                        5,
                        4,
                        ""
                ),
                new UserWidgetModel(
                        NanoId.generate(25),
                        UserWidgetModel.WidgetType.LECTURE_TIMER,
                        6,
                        0,
                        5,
                        4,
                        ""
                )
        );
    }
}
