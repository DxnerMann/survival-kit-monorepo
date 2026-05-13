package com.survivalkit.backend.adapter.rapla;

import com.survivalkit.backend.shared.Lecture;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

@Service
public class RaplaApiClient implements RaplaApiPort {

    private final RestClient restClient;

    public RaplaApiClient(RestClient restClient) {
        this.restClient = restClient;
    }

    @Override
    public List<Lecture> getLectures(int weekOffset, String raplaUrl) {
        /* TODO: Fetch Html Page from provided Rapla link
         *   - append "&day=20&month=5&year=2026" format to decide on week
         *   - Take all <td> with class="week_block"
         *       - Take out start and end time from: <a> START - END <br> Lecture Name </a>
         *       - Decide on lecture type from background-color:
         *           - #EEEEEE -> LECTURE
         *           - #FF0000 -> EXAM
         *           - All other -> OTHER
         *       - Lecturer => <span class="person"></span>
         *       - Course, Room => <span class="resource"></span> // Decide from lengtgh whats course or room
         *       - Day = Count of small class="week_smallseparatorcell" before class="week_block" in the same <tr>
         *           - 1 => Monday, 2 => Tuesday, ...
         *   - Convert to Lecture Record
         *   - Return List
         */
    }

    @Override
    public String extractCourse(String raplaUrl) {
        /* TODO: Fetch Html Page from provided Rapla link
         *   - decide user course from "file=<Course Name>" from the provided url and <title>Course Name</title> and <h2 class="title"> as fallback
         */
        return "";
    }
}