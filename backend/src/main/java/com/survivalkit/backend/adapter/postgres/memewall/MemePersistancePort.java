package com.survivalkit.backend.adapter.postgres.memewall;

import com.survivalkit.backend.shared.Page;
import com.survivalkit.backend.shared.UserVote;
import com.survivalkit.backend.shared.VoteUpdate;

import java.util.List;
import java.util.Optional;

public interface MemePersistancePort {

    Optional<Meme> findDailyMeme(String course, String day);

    void saveMeme(Meme meme);

    Page<Meme> getMemesByCourse(String course, int pageSize, String continuation);

    Page<Meme> getMemesForAdmin(String course, int pageSize, String continuation);

    Optional<Meme> getMemeByIdAndCourse(String id, String course);

    Optional<MemeOwner> findOwner(String id);

    void deleteMeme(String id);

    VoteUpdate castMemeVote(String id, boolean upVote, String userId);

    List<UserVote> findVotesByUser(String userId, String course);

    boolean canVote(String memeId, String userId);
}
