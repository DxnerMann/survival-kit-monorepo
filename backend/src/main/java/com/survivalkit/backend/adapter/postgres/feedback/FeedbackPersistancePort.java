package com.survivalkit.backend.adapter.postgres.feedback;

import com.survivalkit.backend.shared.Page;
import com.survivalkit.backend.shared.UserVote;
import com.survivalkit.backend.shared.VoteUpdate;

import java.util.List;
import java.util.Optional;

public interface FeedbackPersistancePort {
    void saveFeedback(Feedback feedback);
    Page<Feedback> getFeedbackPaged(int pageSize, String continuation);
    VoteUpdate castFeedbackVote(String id, boolean upVote, String userId);

    List<UserVote> findVotesByUser(String userId);
    void deleteFeedback(String id);
    boolean resolveFeedback(String id);
    List<Feedback> findArchived();
    void deleteAllVotes(String userId);
    void answerFeedback(String id, String answer);
    Optional<String> findAuthorUserId(String id);
    Optional<FeedbackSubject> findSubject(String id);
    boolean canVote(String feedbackId, String userId);
    List<AnsweredFeedbackNotice> findAnsweredByUser(String userId);
    void deleteUser(String userId);
}
