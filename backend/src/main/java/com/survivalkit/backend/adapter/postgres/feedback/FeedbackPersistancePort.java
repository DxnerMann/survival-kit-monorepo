package com.survivalkit.backend.adapter.postgres.feedback;

import com.survivalkit.backend.shared.Page;

import java.util.List;
import java.util.Optional;

public interface FeedbackPersistancePort {
    void saveFeedback(Feedback feedback);
    Page<Feedback> getFeedbackPaged(int pageSize, String continuation);
    void rateFeedback(String id, Boolean upVote, String userId);
    void deleteFeedback(String id);
    void deleteAllVotes(String userId);
    void answerFeedback(String id, String answer);
    Optional<String> findAuthorUserId(String id);
    Optional<FeedbackSubject> findSubject(String id);
    boolean canVote(String feedbackId, String userId);
    List<AnsweredFeedbackNotice> findAnsweredByUser(String userId);
    void deleteUser(String userId);
}
