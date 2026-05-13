package com.survivalkit.backend.shared;

import java.util.List;

public record Lecture(
        String title,
        LectureType type,
        String startTime,
        String endTime,
        List<String> rooms,
        String lecturer,
        List<String> courses
) {
    public enum LectureType{
        LECTURE,
        EXAM,
        OTHER
    };
}
