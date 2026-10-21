package com.survivalkit.backend.adapter.postgres.memewall;

import com.survivalkit.backend.shared.Page;

import java.util.Optional;

public interface MemePersistancePort {

    Optional<Meme> findDailyMeme(String course, String day);

    void saveMeme(Meme meme);

    Page<Meme> getMemesByCourse(String course, int pageSize, String continuation);

    Page<Meme> getMemesForAdmin(String course, int pageSize, String continuation);

    Optional<Meme> getMemeByIdAndCourse(String id, String course);

    Optional<MemeOwner> findOwner(String id);

    void deleteMeme(String id);

    boolean rateMeme(String id, boolean upVote, String userId);

    boolean canVote(String memeId, String userId);
}
