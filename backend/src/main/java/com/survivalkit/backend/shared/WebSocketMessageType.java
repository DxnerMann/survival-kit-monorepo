package com.survivalkit.backend.shared;

public final class WebSocketMessageType {

    private WebSocketMessageType() {}

    public static final String CONNECTED = "CONNECTED";
    public static final String JOIN = "JOIN";
    public static final String JOINED = "JOINED";
    public static final String LEAVE = "LEAVE";
    public static final String LEFT = "LEFT";
    public static final String MESSAGE = "MESSAGE";
    public static final String ERROR = "ERROR";
}
