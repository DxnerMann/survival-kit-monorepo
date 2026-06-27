package com.survivalkit.backend.core.feedback;

import com.survivalkit.backend.adapter.postgres.feedback.Feedback;
import com.survivalkit.backend.adapter.postgres.feedback.FeedbackPersistancePort;
import com.survivalkit.backend.adapter.postgres.usetracking.TrackAction;
import com.survivalkit.backend.config.SecurityContext;
import com.survivalkit.backend.core.statistics.StatisticsPort;
import com.survivalkit.backend.shared.Page;
import io.viascom.nanoid.NanoId;
import org.springframework.data.relational.core.sql.In;
import org.springframework.stereotype.Service;

import java.time.Instant;

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

        var user = SecurityContext.current();

        if (user.isEmpty()) {
            throw new IllegalStateException(
                    "No authenticated user in context. " +
                            "Ensure this is called within a secured request.");
        }

        var newFeedback = new Feedback(
            NanoId.generate(25),
                title,
                description,
                user.get().username(),
                user.get().userId(),
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

        var user = SecurityContext.current();

        if (user.isEmpty()) {
            throw new IllegalStateException(
                    "No authenticated user in context. " +
                            "Ensure this is called within a secured request.");
        }

        if (feedbackPersistancePort.canVote(feedbackId, user.get().userId())) {
            feedbackPersistancePort.rateFeedback(feedbackId, upVote, user.get().userId());
        }
    }

    @Override
    public void deleteFeedback(String feedbackId) {
        feedbackPersistancePort.deleteFeedback(feedbackId);
    }

    @Override
    public void answerFeedback(String id, String answer) {
        feedbackPersistancePort.answerFeedback(id, answer);
    }

    @Override
    public boolean hasVoted(String id) {
        var user = SecurityContext.current();

        if (user.isEmpty()) {
            throw new IllegalStateException(
                    "No authenticated user in context. " +
                            "Ensure this is called within a secured request.");
        }

        return !feedbackPersistancePort.canVote(id, user.get().userId());
    }
}
