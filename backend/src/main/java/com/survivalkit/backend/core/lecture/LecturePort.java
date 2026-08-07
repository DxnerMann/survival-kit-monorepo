package com.survivalkit.backend.core.lecture;

import java.util.List;

public interface LecturePort {

    LecturePlanResult getLecturesForWeek(int weekOffset, String course, String raplaUrl);

    List<String> getLectureNamesForSemester(String course);
}
