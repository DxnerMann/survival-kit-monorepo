package com.survivalkit.backend.core.presentationgame;

import com.survivalkit.backend.adapter.postgres.presentationgame.PresentationGamePersistancePort;
import com.survivalkit.backend.adapter.postgres.presentationgame.PresentationGameRoom;
import com.survivalkit.backend.adapter.postgres.presentationgame.PresentationGameRoomListItem;
import com.survivalkit.backend.adapter.postgres.usetracking.TrackAction;
import com.survivalkit.backend.adapter.postgres.user.UserPersistancePort;
import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.adapter.web.presentationgame.CreatePresentationGameRoomRequest;
import com.survivalkit.backend.adapter.web.presentationgame.PresentationGameFinishedResponse;
import com.survivalkit.backend.adapter.web.presentationgame.PresentationGameRoomCreatedResponse;
import com.survivalkit.backend.adapter.web.presentationgame.PresentationGameRoomDetailResponse;
import com.survivalkit.backend.adapter.web.presentationgame.PresentationGameRoomJoinedResponse;
import com.survivalkit.backend.adapter.web.presentationgame.PresentationGameRoomMemberResponse;
import com.survivalkit.backend.context.SecurityContext;
import com.survivalkit.backend.core.statistics.StatisticsPort;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.survivalkit.backend.adapter.web.presentationgame.PresentationGameActionResponse;
import com.survivalkit.backend.adapter.web.presentationgame.PresentationGameStateResponse;
import com.survivalkit.backend.core.websocket.WebSocketPort;
import com.survivalkit.backend.shared.WebSocketChannels;
import com.survivalkit.backend.shared.WebSocketEnvelope;
import com.survivalkit.backend.shared.WebSocketMessageType;
import io.viascom.nanoid.NanoId;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;

import static com.survivalkit.backend.context.SecurityContext.requireVerification;

@Service
public class PresentationGameService implements PresentationGamePort {

    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 6;
    private static final int FINISHED_GAMES_LIMIT = 20;
    private static final String VOTE_APPROVE = "APPROVE";

    private final PresentationGamePersistancePort persistancePort;
    private final UserPersistancePort userPersistancePort;
    private final StatisticsPort statisticsPort;
    private final GermanWordPort germanWordPort;
    private final WebSocketPort webSocketPort;
    private final ObjectMapper objectMapper;
    private final SecureRandom random = new SecureRandom();

    public PresentationGameService(
            PresentationGamePersistancePort persistancePort,
            UserPersistancePort userPersistancePort,
            StatisticsPort statisticsPort,
            GermanWordPort germanWordPort,
            WebSocketPort webSocketPort,
            ObjectMapper objectMapper
    ) {
        this.persistancePort = persistancePort;
        this.userPersistancePort = userPersistancePort;
        this.statisticsPort = statisticsPort;
        this.germanWordPort = germanWordPort;
        this.webSocketPort = webSocketPort;
        this.objectMapper = objectMapper;
    }

    @Override
    public PresentationGameRoomCreatedResponse createRoom(CreatePresentationGameRoomRequest request) {
        requireVerification();

        if (request.name() == null || request.name().isBlank()) {
            throw new IllegalArgumentException(ErrorCode.PRESENTATION_ROOM_NAME_EMPTY.getCode());
        }

        if (request.difficulty() == null) {
            throw new IllegalArgumentException(ErrorCode.PRESENTATION_ROOM_NAME_EMPTY.getCode());
        }

        var user = currentUser();

        String course = null;
        if (request.isPublic()) {
            if (user.course() == null || user.course().isBlank()) {
                throw new IllegalArgumentException(ErrorCode.PRESENTATION_COURSE_REQUIRED.getCode());
            }
            course = user.course();
        }

        var room = new PresentationGameRoom(
                NanoId.generate(25),
                request.name().trim(),
                user.id(),
                user.username(),
                course,
                request.isPublic(),
                generateJoinCode(),
                request.difficulty(),
                PresentationGameRoom.Status.LOBBY,
                Instant.now(),
                null,
                null,
                0,
                0
        );

        persistancePort.createRoom(room);
        persistancePort.addMember(room.id(), user.id(), user.username());
        statisticsPort.saveTrackAction(TrackAction.Action.PRESENTATION_GAME_PLAYED);

        return new PresentationGameRoomCreatedResponse(
                room.id(),
                room.name(),
                room.joinCode(),
                room.isPublic()
        );
    }

    @Override
    public List<PresentationGameRoomListItem> getPublicRooms() {
        requireVerification();
        var user = currentUser();

        if (user.course() == null || user.course().isBlank()) {
            return List.of();
        }

        return persistancePort.findPublicLobbyRoomsForCourse(user.course());
    }

    @Override
    public List<PresentationGameFinishedResponse> getFinishedGames() {
        requireVerification();
        var user = currentUser();

        var course = user.course() == null || user.course().isBlank() ? "" : user.course();

        return persistancePort.findFinishedGames(course, FINISHED_GAMES_LIMIT).stream()
                .map(item -> new PresentationGameFinishedResponse(
                        item.id(),
                        item.name(),
                        item.hostUsername(),
                        item.presenterPoints(),
                        item.finishedAt()
                ))
                .toList();
    }

    @Override
    public PresentationGameRoomJoinedResponse joinRoomById(String roomId) {
        requireVerification();

        var room = persistancePort.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException(ErrorCode.PRESENTATION_ROOM_NOT_FOUND.getCode()));

        assertCanJoin(room);

        if (!room.isPublic()) {
            throw new IllegalArgumentException(ErrorCode.PRESENTATION_ROOM_ACCESS_DENIED.getCode());
        }

        var user = currentUser();

        if (user.course() == null || user.course().isBlank()
                || room.course() == null
                || !room.course().equals(user.course())) {
            throw new IllegalArgumentException(ErrorCode.PRESENTATION_ROOM_ACCESS_DENIED.getCode());
        }

        joinRoom(room, user.id(), user.username());

        return toJoinedResponse(room);
    }

    @Override
    public PresentationGameRoomJoinedResponse joinRoomByCode(String code) {
        requireVerification();

        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException(ErrorCode.PRESENTATION_ROOM_CODE_INVALID.getCode());
        }

        var room = persistancePort.findByJoinCode(code.trim())
                .orElseThrow(() -> new IllegalArgumentException(ErrorCode.PRESENTATION_ROOM_CODE_INVALID.getCode()));

        assertCanJoin(room);

        var user = currentUser();
        joinRoom(room, user.id(), user.username());

        return toJoinedResponse(room);
    }

    @Override
    public PresentationGameRoomDetailResponse getRoomByCode(String code, boolean autoJoin) {
        requireVerification();

        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException(ErrorCode.PRESENTATION_ROOM_CODE_INVALID.getCode());
        }

        var room = persistancePort.findByJoinCode(code.trim())
                .orElseThrow(() -> new IllegalArgumentException(ErrorCode.PRESENTATION_ROOM_CODE_INVALID.getCode()));

        var authUser = SecurityContext.current();
        var user = currentUser();
        var isMember = persistancePort.isMember(room.id(), user.id());
        var canJoin = room.status() == PresentationGameRoom.Status.LOBBY;

        if (autoJoin && canJoin && !isMember) {
            joinRoom(room, user.id(), user.username());
            isMember = true;
        }

        if (!isMember && room.status() != PresentationGameRoom.Status.LOBBY) {
            throw new IllegalArgumentException(ErrorCode.PRESENTATION_ROOM_ALREADY_STARTED.getCode());
        }

        var members = persistancePort.findMembers(room.id()).stream()
                .map(member -> new PresentationGameRoomMemberResponse(
                        member.userId(),
                        member.username(),
                        member.host()
                ))
                .toList();

        return new PresentationGameRoomDetailResponse(
                room.id(),
                room.name(),
                room.joinCode(),
                room.hostUserId(),
                room.hostUsername(),
                room.difficulty(),
                room.status(),
                room.isPublic(),
                room.hostUserId().equals(authUser.userId()),
                canJoin && !isMember,
                members
        );
    }

    @Override
    public void startRoom(String code) {
        requireVerification();

        var room = findRoomByCode(code);
        assertHost(room);

        if (room.status() != PresentationGameRoom.Status.LOBBY) {
            throw new IllegalArgumentException(ErrorCode.PRESENTATION_ROOM_NOT_IN_LOBBY.getCode());
        }

        var words = germanWordPort.fetchWords(
                PresentationGameRules.WORD_PREFETCH_BATCH,
                room.difficulty(),
                List.of()
        );
        persistancePort.startRoom(room.id(), Instant.now());
        persistancePort.saveWords(room.id(), words);

        broadcastGameEvent(room.id(), buildStateEvent("STARTED", room.id(), null, reloadRoom(room.id())));
    }

    @Override
    public void finishRoom(String code) {
        requireVerification();

        var room = findRoomByCode(code);
        assertHost(room);

        if (room.status() != PresentationGameRoom.Status.IN_PROGRESS) {
            throw new IllegalArgumentException(ErrorCode.PRESENTATION_ROOM_NOT_IN_PROGRESS.getCode());
        }

        completeGame(room);
    }

    @Override
    public PresentationGameStateResponse getGameState(String code) {
        requireVerification();

        var room = findRoomByCode(code);
        assertMember(room);

        return buildGameState(room, currentUser());
    }

    @Override
    public PresentationGameActionResponse skipWord(String code) {
        requireVerification();

        var room = findRoomByCode(code);
        var user = currentUser();
        assertHost(room);
        assertInProgress(room);

        if (!PresentationGameRules.canSkip(room.difficulty())) {
            throw new IllegalArgumentException(ErrorCode.PRESENTATION_SKIP_NOT_ALLOWED.getCode());
        }

        var wordIndex = room.currentWordIndex();
        assertHasCurrentWord(room, wordIndex);

        var penalty = PresentationGameRules.skipPenalty(room.difficulty());
        if (!persistancePort.advanceWord(room.id(), wordIndex, penalty)) {
            room = reloadRoom(room.id());
            return buildActionFromRoom("SKIP", user.id(), user.username(), penalty, room);
        }

        room = reloadRoom(room.id());
        ensureWordsPrefetched(room);
        room = reloadRoom(room.id());
        var action = buildActionFromRoom("SKIP", user.id(), user.username(), penalty, room);
        broadcastGameEvent(room.id(), action);

        return action;
    }

    @Override
    public PresentationGameActionResponse approveWord(String code) {
        requireVerification();

        var room = findRoomByCode(code);
        var user = currentUser();
        assertMember(room);
        assertInProgress(room);

        var members = persistancePort.findMembers(room.id());
        var jurySize = PresentationGameRules.jurySize(members.size());
        var isHost = room.hostUserId().equals(user.id());
        var canApprove = (!isHost && jurySize > 0) || (isHost && jurySize == 0);

        if (!canApprove) {
            throw new IllegalArgumentException(ErrorCode.PRESENTATION_NOT_JURY.getCode());
        }

        var wordIndex = room.currentWordIndex();
        assertHasCurrentWord(room, wordIndex);

        if (persistancePort.hasVoted(room.id(), wordIndex, user.id())) {
            throw new IllegalArgumentException(ErrorCode.PRESENTATION_ALREADY_VOTED.getCode());
        }

        persistancePort.addVote(room.id(), wordIndex, user.id(), VOTE_APPROVE);

        var approvals = persistancePort.countApprovals(room.id(), wordIndex);
        var threshold = PresentationGameRules.approvalThreshold(jurySize);
        var pointsDelta = 0;
        var eventType = "APPROVE_VOTE";

        if (approvals >= threshold) {
            pointsDelta = PresentationGameRules.approvePoints(room.difficulty());
            persistancePort.advanceWord(room.id(), wordIndex, pointsDelta);
            room = reloadRoom(room.id());
            ensureWordsPrefetched(room);
            room = reloadRoom(room.id());
            eventType = "APPROVE";

            var action = buildActionFromRoom(eventType, user.id(), user.username(), pointsDelta, room);
            broadcastGameEvent(room.id(), action);

            return action;
        }

        room = reloadRoom(room.id());
        var voteAction = new PresentationGameActionResponse(
                "APPROVE_VOTE",
                0,
                user.id(),
                user.username(),
                room.presenterPoints(),
                currentWord(room),
                wordIndex,
                persistancePort.countWords(room.id()),
                approvals,
                threshold
        );
        broadcastGameEvent(room.id(), voteAction);
        return voteAction;
    }

    private void completeGame(PresentationGameRoom room) {
        var latest = reloadRoom(room.id());
        if (latest.status() == PresentationGameRoom.Status.FINISHED) {
            return;
        }
        persistancePort.finishRoom(latest.id(), Instant.now(), latest.presenterPoints());
        var finished = reloadRoom(latest.id());
        broadcastGameEvent(finished.id(), buildStateEvent("FINISHED", finished.id(), null, finished));
    }

    private PresentationGameStateResponse buildGameState(PresentationGameRoom room, com.survivalkit.backend.adapter.postgres.user.UserModel user) {
        if (room.status() == PresentationGameRoom.Status.IN_PROGRESS) {
            ensureWordsPrefetched(room);
            room = reloadRoom(room.id());
        }

        var members = persistancePort.findMembers(room.id()).stream()
                .map(member -> new PresentationGameRoomMemberResponse(
                        member.userId(),
                        member.username(),
                        member.host()
                ))
                .toList();

        var jurySize = PresentationGameRules.jurySize(members.size());
        var isHost = room.hostUserId().equals(user.id());
        var threshold = PresentationGameRules.approvalThreshold(jurySize);
        var wordIndex = room.currentWordIndex();
        var totalWords = persistancePort.countWords(room.id());
        var approvals = persistancePort.countApprovals(room.id(), wordIndex);
        var approvingUserIds = persistancePort.findApprovingUserIds(room.id(), wordIndex);
        var hasVoted = persistancePort.hasVoted(room.id(), wordIndex, user.id());
        var canApprove = room.status() == PresentationGameRoom.Status.IN_PROGRESS
                && ((!isHost && jurySize > 0) || (isHost && jurySize == 0))
                && !hasVoted
                && wordIndex < totalWords;

        return new PresentationGameStateResponse(
                currentWord(room),
                wordIndex,
                totalWords,
                room.presenterPoints(),
                jurySize,
                threshold,
                approvals,
                approvingUserIds,
                room.difficulty(),
                room.status(),
                isHost,
                !isHost && jurySize > 0,
                isHost && PresentationGameRules.canSkip(room.difficulty()) && room.status() == PresentationGameRoom.Status.IN_PROGRESS,
                canApprove,
                hasVoted,
                members
        );
    }

    private PresentationGameActionResponse buildActionFromRoom(
            String event,
            String userId,
            String username,
            int pointsDelta,
            PresentationGameRoom room
    ) {
        var jurySize = PresentationGameRules.jurySize(persistancePort.findMembers(room.id()).size());
        var wordIndex = room.currentWordIndex();
        var totalWords = persistancePort.countWords(room.id());

        return new PresentationGameActionResponse(
                event,
                pointsDelta,
                userId,
                username,
                room.presenterPoints(),
                currentWord(room),
                wordIndex,
                totalWords,
                persistancePort.countApprovals(room.id(), wordIndex),
                PresentationGameRules.approvalThreshold(jurySize)
        );
    }

    private PresentationGameActionResponse buildStateEvent(
            String event,
            String roomId,
            String userId,
            PresentationGameRoom room
    ) {
        return new PresentationGameActionResponse(
                event,
                0,
                userId,
                null,
                room.presenterPoints(),
                currentWord(room),
                room.currentWordIndex(),
                persistancePort.countWords(roomId),
                0,
                PresentationGameRules.approvalThreshold(
                        PresentationGameRules.jurySize(persistancePort.findMembers(roomId).size())
                )
        );
    }

    private void broadcastGameEvent(String roomId, PresentationGameActionResponse action) {
        var channel = WebSocketChannels.presentationGameRoom(roomId);
        ObjectNode payload = objectMapper.valueToTree(action);
        webSocketPort.broadcastToChannel(
                channel,
                WebSocketEnvelope.of(WebSocketMessageType.MESSAGE, channel, payload)
        );
    }

    private PresentationGameRoom reloadRoom(String roomId) {
        return persistancePort.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException(ErrorCode.PRESENTATION_ROOM_NOT_FOUND.getCode()));
    }

    private void ensureWordsPrefetched(PresentationGameRoom room) {
        var totalWords = persistancePort.countWords(room.id());
        var remaining = totalWords - room.currentWordIndex();
        if (remaining > PresentationGameRules.WORD_PREFETCH_REMAINING) {
            return;
        }

        var existing = persistancePort.findAllWordTexts(room.id());
        var newWords = germanWordPort.fetchWords(
                PresentationGameRules.WORD_PREFETCH_BATCH,
                room.difficulty(),
                existing
        );
        if (newWords.isEmpty()) {
            return;
        }

        persistancePort.appendWords(room.id(), newWords, totalWords);
    }

    private String currentWord(PresentationGameRoom room) {
        return persistancePort.findWord(room.id(), room.currentWordIndex()).orElse("");
    }

    private void assertHasCurrentWord(PresentationGameRoom room, int wordIndex) {
        ensureWordsPrefetched(room);
        if (wordIndex >= persistancePort.countWords(room.id())) {
            throw new IllegalArgumentException(ErrorCode.PRESENTATION_NO_WORDS_LEFT.getCode());
        }
    }

    private void assertInProgress(PresentationGameRoom room) {
        if (room.status() != PresentationGameRoom.Status.IN_PROGRESS) {
            throw new IllegalArgumentException(ErrorCode.PRESENTATION_ROOM_NOT_IN_PROGRESS.getCode());
        }
    }

    private void assertMember(PresentationGameRoom room) {
        var authUser = SecurityContext.current();
        if (!persistancePort.isMember(room.id(), authUser.userId())) {
            throw new IllegalArgumentException(ErrorCode.PRESENTATION_ROOM_ACCESS_DENIED.getCode());
        }
    }

    private void joinRoom(PresentationGameRoom room, String userId, String username) {
        if (!persistancePort.isMember(room.id(), userId)) {
            persistancePort.addMember(room.id(), userId, username);
            statisticsPort.saveTrackAction(TrackAction.Action.PRESENTATION_GAME_PLAYED);
        }
    }

    private void assertCanJoin(PresentationGameRoom room) {
        if (room.status() != PresentationGameRoom.Status.LOBBY) {
            throw new IllegalArgumentException(ErrorCode.PRESENTATION_ROOM_ALREADY_STARTED.getCode());
        }
    }

    private void assertHost(PresentationGameRoom room) {
        var authUser = SecurityContext.current();
        if (!room.hostUserId().equals(authUser.userId())) {
            throw new IllegalArgumentException(ErrorCode.PRESENTATION_ROOM_NOT_HOST.getCode());
        }
    }

    private PresentationGameRoom findRoomByCode(String code) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException(ErrorCode.PRESENTATION_ROOM_CODE_INVALID.getCode());
        }
        return persistancePort.findByJoinCode(code.trim())
                .orElseThrow(() -> new IllegalArgumentException(ErrorCode.PRESENTATION_ROOM_NOT_FOUND.getCode()));
    }

    private com.survivalkit.backend.adapter.postgres.user.UserModel currentUser() {
        var authUser = SecurityContext.current();
        return userPersistancePort.getById(authUser.userId())
                .orElseThrow(() -> new IllegalStateException(ErrorCode.USER_DOES_NOT_EXIST.getCode()));
    }

    private PresentationGameRoomJoinedResponse toJoinedResponse(PresentationGameRoom room) {
        return new PresentationGameRoomJoinedResponse(room.id(), room.name(), room.joinCode());
    }

    private String generateJoinCode() {
        var builder = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            builder.append(CODE_CHARS.charAt(random.nextInt(CODE_CHARS.length())));
        }
        return builder.toString();
    }
}
