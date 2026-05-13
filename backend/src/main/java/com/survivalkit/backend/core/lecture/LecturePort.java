package com.survivalkit.backend.core.lecture;

import com.survivalkit.backend.shared.Lecture;

import java.util.List;

public interface LecturePort {

    List<Lecture> getLecturesForWeek(int weekOffset, String course, String raplaUrl);

}
