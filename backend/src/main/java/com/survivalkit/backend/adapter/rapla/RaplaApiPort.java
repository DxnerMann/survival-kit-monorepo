package com.survivalkit.backend.adapter.rapla;

import com.survivalkit.backend.shared.Lecture;

import java.util.List;

public interface RaplaApiPort {

    List<Lecture> getLectures(int weekOffset, String raplaUrl);
    String extractCourse(String raplaUrl);

}
