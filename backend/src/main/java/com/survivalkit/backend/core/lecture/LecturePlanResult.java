package com.survivalkit.backend.core.lecture;

import com.survivalkit.backend.shared.Lecture;

import java.util.List;

public record LecturePlanResult(
        List<Lecture> lectures,
        String notice
) {}
