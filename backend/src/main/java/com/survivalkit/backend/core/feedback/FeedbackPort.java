package com.survivalkit.backend.core.feedback;

import com.survivalkit.backend.adapter.postgres.feedback.AnsweredFeedbackNotice;
import com.survivalkit.backend.adapter.postgres.feedback.Feedback;
import com.survivalkit.backend.shared.Page;
import com.survivalkit.backend.shared.UserVote;
import com.survivalkit.backend.shared.VoteUpdate;

import java.util.List;

public interface FeedbackPort {
    void saveFeedback(String title, String description, Feedback.FeedbackType type);
    Page<Feedback> getFeedbackPaged(Integer pageSize, String continuation);
    VoteUpdate rateFeedback(String id, Boolean upVote);
    List<UserVote> myVotes();
    void deleteFeedback(String id);
    void resolveFeedback(String id);
    void answerFeedback(String id, String answer);
    List<Feedback> archivedFeedback();
    boolean hasVoted(String id);
    List<AnsweredFeedbackNotice> answeredFeedback();

}
