package com.survivalkit.backend.core.feedback;

import com.survivalkit.backend.adapter.postgres.feedback.Feedback;
import com.survivalkit.backend.adapter.postgres.feedback.FeedbackPersistancePort;
import com.survivalkit.backend.adapter.postgres.usetracking.TrackAction;
import com.survivalkit.backend.context.SecurityContext;
import com.survivalkit.backend.core.statistics.StatisticsPort;
import com.survivalkit.backend.shared.Page;
import io.viascom.nanoid.NanoId;
import org.springframework.stereotype.Service;

import java.time.Instant;

import static com.survivalkit.backend.context.SecurityContext.requireVerification;

@Service
public class FeedbackService implements FeedbackPort {

    private final FeedbackPersistancePort feedbackPersistancePort;
    private final StatisticsPort statisticsPort;

    public FeedbackService(FeedbackPersistancePort feedbackPersistancePort, StatisticsPort statisticsPort) {
        this.feedbackPersistancePort = feedbackPersistancePort;
		this.statisticsPort = statisticsPort;
    }

    @Override
    public void saveFeedback(String title, String description, Feedback.FeedbackType type) {
        requireVerification();

        var user = SecurityContext.current();

        var newFeedback = new Feedback(
            NanoId.generate(25),
                title,
                description,
                user.username(),
                user.userId(),
                type,
                0,
                0,
                null,
                Instant.now(),
                Instant.now()
        );
        feedbackPersistancePort.saveFeedback(newFeedback);
        statisticsPort.saveTrackAction(TrackAction.Action.IDEA_SUBMITTED);
    }

    @Override
    public Page<Feedback> getFeedbackPaged(Integer pageSize, String continuation) {
        pageSize = pageSize == null ? 50 : pageSize;
        pageSize = pageSize > 50 ? 50 : pageSize;

        return feedbackPersistancePort.getFeedbackPaged(pageSize, continuation);
    }

    @Override
    public void rateFeedback(String feedbackId, Boolean upVote) {

        requireVerification();

        var user = SecurityContext.current();

        if (feedbackPersistancePort.canVote(feedbackId, user.userId())) {
            feedbackPersistancePort.rateFeedback(feedbackId, upVote, user.userId());
        }
    }

    @Override
    public void deleteFeedback(String feedbackId) {
        requireVerification();
        feedbackPersistancePort.deleteFeedback(feedbackId);
    }

    @Override
    public void answerFeedback(String id, String answer) {
        requireVerification();
        feedbackPersistancePort.answerFeedback(id, answer);
    }

    @Override
    public boolean hasVoted(String id) {
        var user = SecurityContext.current();
        return !feedbackPersistancePort.canVote(id, user.userId());
    }
}
