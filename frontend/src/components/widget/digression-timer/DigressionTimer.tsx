import './DigressionTimer.css';
import {Fullscreen} from "lucide-react";
import {useEffect, useRef, useState} from "react";
import type {WidgetProps} from "../../../models/WidgetProps.tsx";
import Button from "../../shared/Button.tsx";
import {createPortal} from "react-dom";
import {formatTimeMs} from "../../../services/utils.tsx";

interface DigressionTimerData {
    lecturerName: string,
    timeElapsed: number,
    running: boolean,
    lastSavedAt: number | null
}

const defaultData: DigressionTimerData = {
    lecturerName: "",
    timeElapsed: 0,
    running: false,
    lastSavedAt: null
}

const LOCAL_STORAGE_KEY = "digression_timer_data";

const loadFromStorage = (): DigressionTimerData => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data === null) return defaultData;
    try {
        const parsed: DigressionTimerData = JSON.parse(data);
        if (
            parsed.running &&
            parsed.lastSavedAt !== null &&
            Number.isFinite(parsed.lastSavedAt) &&
            Number.isFinite(parsed.timeElapsed)
        ) {
            parsed.timeElapsed += Date.now() - parsed.lastSavedAt;
        }
        return parsed;
    } catch {
        return defaultData;
    }
};

const stored = loadFromStorage();

const DigressionTimer = ({title, isPreview}: WidgetProps) => {
    const [inFullscreen, setInFullscreen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const elapsedRef = useRef<number>(stored.timeElapsed);
    const textRef = useRef<string>(stored.lecturerName);
    const runningRef = useRef<boolean>(stored.running);
    const baseElapsedRef = useRef<number>(stored.timeElapsed);
    const isMounted = useRef(false);

    const [text, setText] = useState(stored.lecturerName);
    const [elapsed, setElapsed] = useState(stored.timeElapsed);
    const [running, setRunning] = useState(stored.running);

    // eslint-disable-next-line react-hooks/refs
    elapsedRef.current = elapsed;
    // eslint-disable-next-line react-hooks/refs
    textRef.current = text;
    // eslint-disable-next-line react-hooks/refs
    runningRef.current = running;

    const saveSettings = (currentText: string, currentElapsed: number, currentRunning: boolean) => {
        const updated: DigressionTimerData = {
            lecturerName: currentText,
            timeElapsed: currentElapsed,
            running: currentRunning,
            lastSavedAt: Date.now()
        };
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
            throw new Error("Error while trying to parse data for " + title, {cause: e});
        }
    };

    useEffect(() => {
        const video = videoRef.current;
        if (stored.running && video) video.play();
    }, []);

    useEffect(() => {
        if (running) {
            const startedAt = Date.now();
            const base = baseElapsedRef.current;
            intervalRef.current = setInterval(() => {
                setElapsed(base + (Date.now() - startedAt));
            }, 10);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [running]);

    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            return;
        }
        saveSettings(textRef.current, elapsedRef.current, running);
    }, [running]);

    useEffect(() => {
        if (!running) return;
        const saveInterval = setInterval(() => {
            saveSettings(textRef.current, elapsedRef.current, runningRef.current);
        }, 1000);
        return () => clearInterval(saveInterval);
    }, [running]);

    useEffect(() => {
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            saveSettings(textRef.current, elapsedRef.current, runningRef.current);
        };
    }, []);

    const togglePlay = () => {
        const video = videoRef.current;
        if (running) {
            baseElapsedRef.current = elapsedRef.current;
            setRunning(false);
            if (video) video.pause();
        } else {
            setRunning(true);
            if (video) video.play();
        }
    };

    const handleReset = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        baseElapsedRef.current = 0;
        setRunning(false);
        setElapsed(0);
        setText("");
        const video = videoRef.current;
        if (video) video.pause();
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    };

    const handleTextChange = (value: string) => {
        setText(value);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            saveSettings(value, elapsedRef.current, runningRef.current);
        }, 2000);
    };

    const handleLoaded = () => {
        const video = videoRef.current;
        if (!video) return;
        if (runningRef.current) video.play();
        else video.pause();
    };

    if (isPreview) {
        return <>
            <div className="digression-widget-preview">
                <video
                    ref={videoRef}
                    src="/videos/digression.mp4"
                    onLoadedMetadata={() => handleLoaded()}
                    loop muted playsInline
                />
            </div>
            <h3 className="widget-title-preview">{title}</h3>
        </>
    }

    const getComponent = () => (
        <div className={`digression-timer-widget ${inFullscreen ? "fullscreen" : ""}`}>
            <div className="widget-header">
                <Fullscreen
                    className="widget-header-icon"
                    size={20}
                    onClick={() => setInFullscreen(!inFullscreen)}
                />
            </div>
            <div className="widget-content">
                <div className="digression-video-wrapper">
                    <div className="digression-timer-caption">
                        <input
                            className="digression-video-caption"
                            type="text"
                            maxLength={30}
                            value={text}
                            onChange={(e) => handleTextChange(e.target.value)}
                            placeholder="<Caption>"
                        />
                        <h3 className="digression-video-timer">{"SEIT " + formatTimeMs(elapsed)}</h3>
                    </div>
                    <video
                        ref={videoRef}
                        src="/videos/digression.mp4"
                        onLoadedMetadata={() => handleLoaded()}
                        loop muted playsInline
                    />
                </div>
                <div className="digression-video-buttons">
                    <Button text={running ? "Pause" : "Start"} onClick={togglePlay} type="submit" variant="secondary" fullWidth={true}/>
                    <Button text={"Reset"} onClick={handleReset} type="reset" variant="primary" fullWidth={true}/>
                </div>
            </div>
        </div>
    );

    return <>
        {inFullscreen && createPortal(getComponent(), document.body)}
        {!inFullscreen && getComponent()}
    </>
}

export default DigressionTimer;