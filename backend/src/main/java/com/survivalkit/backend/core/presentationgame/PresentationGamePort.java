package com.survivalkit.backend.core.presentationgame;

import com.survivalkit.backend.adapter.postgres.presentationgame.PresentationGameRoomListItem;
import com.survivalkit.backend.adapter.web.presentationgame.CreatePresentationGameRoomRequest;
import com.survivalkit.backend.adapter.web.presentationgame.PresentationGameActionResponse;
import com.survivalkit.backend.adapter.web.presentationgame.PresentationGameFinishedResponse;
import com.survivalkit.backend.adapter.web.presentationgame.PresentationGameStateResponse;
import com.survivalkit.backend.adapter.web.presentationgame.PresentationGameRoomCreatedResponse;
import com.survivalkit.backend.adapter.web.presentationgame.PresentationGameRoomDetailResponse;
import com.survivalkit.backend.adapter.web.presentationgame.PresentationGameRoomJoinedResponse;

import java.util.List;

public interface PresentationGamePort {

    PresentationGameRoomCreatedResponse createRoom(CreatePresentationGameRoomRequest request);

    List<PresentationGameRoomListItem> getPublicRooms();

    List<PresentationGameFinishedResponse> getFinishedGames();

    PresentationGameRoomJoinedResponse joinRoomById(String roomId);

    PresentationGameRoomJoinedResponse joinRoomByCode(String code);

    PresentationGameRoomDetailResponse getRoomByCode(String code, boolean autoJoin);

    PresentationGameStateResponse startRoom(String code);

    void finishRoom(String code);

    PresentationGameStateResponse getGameState(String code);

    PresentationGameActionResponse skipWord(String code);

    PresentationGameActionResponse approveWord(String code);
}
