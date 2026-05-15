package com.survivalkit.backend.shared;

import java.time.DayOfWeek;
import java.util.List;

public record Lecture(
        String title,
        LectureType type,
        String startTime,
        String endTime,
        List<String> rooms,
        String lecturer,
        List<String> courses,
        DayOfWeek day
) {
    public enum LectureType{
        LECTURE,
        EXAM,
        OTHER
    };
}
