package com.survivalkit.backend.adapter.postgres.presentationgame;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface PresentationGamePersistancePort {

    void createRoom(PresentationGameRoom room);

    void addMember(String roomId, String userId, String username);

    boolean isMember(String roomId, String userId);

    Optional<PresentationGameRoom> findById(String id);

    Optional<PresentationGameRoom> findByJoinCode(String joinCode);

    List<PresentationGameRoomListItem> findPublicLobbyRoomsForCourse(String course);

    List<PresentationGameRoomMember> findMembers(String roomId);

    List<PresentationGameFinishedItem> findFinishedGames(String course, int limit);

    void startRoom(String roomId, Instant startedAt);

    void finishRoom(String roomId, Instant finishedAt, int presenterPoints);

    void deleteAllRooms();

    void saveWords(String roomId, List<String> words);

    void appendWords(String roomId, List<String> words, int startIndex);

    List<String> findAllWordTexts(String roomId);

    Optional<String> findWord(String roomId, int wordIndex);

    int countWords(String roomId);

    boolean hasVoted(String roomId, int wordIndex, String userId);

    void addVote(String roomId, int wordIndex, String userId, String voteType);

    List<String> findApprovingUserIds(String roomId, int wordIndex);

    int countApprovals(String roomId, int wordIndex);

    boolean advanceWord(String roomId, int expectedWordIndex, int pointsDelta);

    void updatePresenterPoints(String roomId, int pointsDelta);
}
