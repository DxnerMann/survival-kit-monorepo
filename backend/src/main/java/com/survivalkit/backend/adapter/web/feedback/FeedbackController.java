package com.survivalkit.backend.adapter.web.feedback;

import com.survivalkit.backend.adapter.catasaservice.CatAASPort;
import com.survivalkit.backend.adapter.postgres.feedback.Feedback;
import com.survivalkit.backend.core.feedback.FeedbackPort;
import com.survivalkit.backend.shared.Page;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("api/v1/feedback")
public class FeedbackController {

    private final FeedbackPort feedbackPort;
    private final CatAASPort catAASPort;

    public FeedbackController(FeedbackPort feedbackPort, CatAASPort catAASPort) {
        this.feedbackPort = feedbackPort;
        this.catAASPort = catAASPort;
    }

    @Role(RoleLevel.USER)
    @PostMapping
    public ResponseEntity<Void> submitFeedback(
            @RequestBody FeedbackSubmissionRequest request
    ) {
        feedbackPort.saveFeedback(request.title(), request.description(), request.type());
        return ResponseEntity.ok().build();
    }

    @Role(RoleLevel.GUEST)
    @GetMapping
    public ResponseEntity<Page<Feedback>> getFeedback(
            @RequestParam(required = false) Integer pageSize,
            @RequestParam(required = false) String continuation
    ) {
        catAASPort.getRandomCatImage(500, 500);
        return ResponseEntity.ok(feedbackPort.getFeedbackPaged(pageSize, continuation));
    }

    @Role(RoleLevel.USER)
    @PatchMapping("/rate")
    public ResponseEntity<Void> rateFeedback(
            @RequestParam String id,
            @RequestParam Boolean upVote
    ) {
        feedbackPort.rateFeedback(id, upVote);
        return ResponseEntity.ok().build();
    }

    @Role(RoleLevel.USER)
    @GetMapping("/alreadyVoted")
    public ResponseEntity<Boolean> hasVoted(
            @RequestParam String id
    ) {
        return ResponseEntity.ok(feedbackPort.hasVoted(id));
    }

    @Role(RoleLevel.ADMIN)
    @DeleteMapping
    public ResponseEntity<Void> deleteFeedback(
            @RequestParam String id
    ) {
        feedbackPort.deleteFeedback(id);
        return ResponseEntity.ok().build();
    }

    @Role(RoleLevel.ADMIN)
    @PatchMapping("/answer")
    public ResponseEntity<Void> deleteFeedback(
            @RequestBody FeedbackAnswerRequest request
    ) {
        feedbackPort.answerFeedback(request.id(), request.answer());
        return ResponseEntity.ok().build();
    }
}
