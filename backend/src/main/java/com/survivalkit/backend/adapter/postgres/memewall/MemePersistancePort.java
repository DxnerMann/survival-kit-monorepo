package com.survivalkit.backend.adapter.postgres.memewall;

import com.survivalkit.backend.shared.Page;

import java.util.Optional;

public interface MemePersistancePort {

    void saveMeme(Meme meme);

    Page<Meme> getMemesByCourse(String course, int pageSize, String continuation);

    Page<Meme> getMemesForAdmin(String course, int pageSize, String continuation);

    Optional<Meme> getMemeByIdAndCourse(String id, String course);

    void deleteMeme(String id);
}
