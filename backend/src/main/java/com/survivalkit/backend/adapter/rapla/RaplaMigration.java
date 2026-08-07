package com.survivalkit.backend.adapter.rapla;

import java.time.LocalDate;
import java.time.ZoneId;

public final class RaplaMigration {

    public static final LocalDate NEW_RAPLA_CUTOFF = LocalDate.of(2026, 10, 1);
    public static final ZoneId ZONE = ZoneId.of("Europe/Berlin");

    public static final String LEGACY_IN_USE_NOTICE =
            "Ab dem 01.10.2026 gilt die neue Rapla-Version. Für diesen Kurs ist noch kein neuer Link hinterlegt – der Plan wird vorübergehend über die alte Rapla-Version geladen.";

    private RaplaMigration() {}
}
