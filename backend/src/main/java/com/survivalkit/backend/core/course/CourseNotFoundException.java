package com.survivalkit.backend.core.course;

public class CourseNotFoundException extends RuntimeException {
    public CourseNotFoundException(String code) {
        super(code);
    }
}
