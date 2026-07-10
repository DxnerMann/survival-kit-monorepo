package com.survivalkit.backend.adapter.rapla;

public class CourseExtractionFailedException extends RuntimeException {
    public CourseExtractionFailedException(String code) {
        super(code);
    }
}
