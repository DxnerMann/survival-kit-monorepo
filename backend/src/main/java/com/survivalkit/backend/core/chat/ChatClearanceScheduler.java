package com.survivalkit.backend.core.chat;

import com.survivalkit.backend.core.websocket.WebSocketPort;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class ChatClearanceScheduler {

    private final ChatPort chatPort;
    private final WebSocketPort webSocketPort;

    public ChatClearanceScheduler(ChatPort chatPort, WebSocketPort webSocketPort) {
        this.chatPort = chatPort;
        this.webSocketPort = webSocketPort;
    }

    @Scheduled(cron = "0 0 0 * * *", zone = "Europe/Berlin")
    public void resetDailyChat() {
        chatPort.deleteAll();
        webSocketPort.broadcastChatCleared();
    }
}
