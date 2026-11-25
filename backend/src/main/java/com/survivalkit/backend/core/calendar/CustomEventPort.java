package com.survivalkit.backend.core.calendar;

import java.util.List;

public interface CustomEventPort {

    List<CustomEvent> listMine();

    CustomEvent create(CreateCustomEventCommand command);

    void respond(String eventId, boolean accept);
}
