package com.survivalkit.backend.adapter.postgres.widget;

public record Widget(
        String id,
        WidgetType type,
        int x,
        int y,
        int width,
        int height,
        String data
) {
    public enum WidgetType{
        LECTURE_PLAN,
        LECTURE_TIMER,
        EMPTY
    }
}
