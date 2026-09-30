package com.survivalkit.backend.adapter.rapla.adapter;

import com.survivalkit.backend.shared.Lecture;
import org.jsoup.nodes.Document;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;

public interface RaplaAdapter {
    String V2 = "v2";
    String id();
    boolean supports(String url);
    String formatToBaseUrl(String url);
    URI buildWeekRequestUri(String baseUrl, LocalDate monday);
    String extractCourse(Document document, String baseUrl);
    List<Lecture> parseLectures(Document document);
}
