package com.survivalkit.backend.adapter.postgres.feedback;

import com.survivalkit.backend.shared.Page;

public interface FeedbackPersistancePort {
    void saveFeedback(Feedback feedback);
    Page<Feedback> getFeedbackPaged(int pageSize, String continuation);
    void rateFeedback(String id, Boolean upVote, String userId);
    void deleteFeedback(String id);
    void answerFeedback(String id, String answer);
    boolean canVote(String feedbackId, String userId);
}
