package com.survivalkit.backend.core.calendar;

import java.util.List;

public interface CustomEventPort {

    List<CustomEvent> listMine();

    CustomEvent create(CreateCustomEventCommand command);

    CustomEvent update(String eventId, CreateCustomEventCommand command);

    void delete(String eventId);

    void respond(String eventId, boolean accept);
}
