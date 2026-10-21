package com.survivalkit.backend.core.meme;

import com.survivalkit.backend.adapter.postgres.memewall.Meme;
import com.survivalkit.backend.shared.Page;
import org.springframework.web.multipart.MultipartFile;

import java.util.Optional;

public interface MemePort {

    void postMeme(MultipartFile file, String title, String description);

    Page<Meme> getMemes(Integer pageSize, String continuation);

    Optional<Meme> findDailyMeme();

    Page<Meme> getMemesForAdmin(String course, Integer pageSize, String continuation);

    Meme getMeme(String id);

    void deleteMeme(String id);

    void rateMeme(String id, boolean upVote);

    boolean hasVoted(String id);
}
