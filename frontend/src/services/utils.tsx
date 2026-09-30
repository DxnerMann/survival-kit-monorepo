import { useState, useRef, useCallback, useEffect } from "react";


export const formatTimeMs = (ms: number) => {
    const centiseconds = Math.floor((ms % 1000) / 10);
    const totalSeconds = Math.floor(ms / 1000);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);
    const clock = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
    if (hours < 1) {
        return clock;
    }
    return `${String(hours).padStart(2, "0")}:${clock}`;
};

export const formatTimestamp = (timestamp: string) => {
    return new Intl.DateTimeFormat("de-DE", {
        timeZone: "Europe/Berlin",
        dateStyle: "medium",
        timeStyle: "medium",
    }).format(new Date(timestamp));
};

export function useCountdownTimer(initialSeconds = 30) {
    const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearTimer = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const start = useCallback(() => {
        clearTimer();
        intervalRef.current = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearTimer();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const reset = useCallback((to = 30) => {
        setSecondsLeft(to);
        start();
    }, [start]);

    useEffect(() => {
        start();
        return clearTimer;
    }, [start]);

    return { secondsLeft, reset };
}