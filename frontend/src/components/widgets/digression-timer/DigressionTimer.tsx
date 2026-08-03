import "@/components/widgets/digression-timer/DigressionTimer.css";
import {ChevronLeft, ChevronRight, Fullscreen} from "lucide-react";
import {useEffect, useRef, useState} from "react";
import type {WidgetProps} from "@/models/WidgetProps.tsx";
import Button from "@/components/ui/Button.tsx";
import {createPortal} from "react-dom";
import {formatTimeMs} from "@/services/utils.tsx";

interface DigressionTimerData {
    lecturerName: string;
    timeElapsed: number;
    running: boolean;
    lastSavedAt: number | null;
    videoIndex: number;
}

const VIDEOS = [
    "/videos/digression.mp4",
    "/videos/digression2.mp4",
] as const;

const defaultData: DigressionTimerData = {
    lecturerName: "",
    timeElapsed: 0,
    running: false,
    lastSavedAt: null,
    videoIndex: 0,
};

const LOCAL_STORAGE_KEY = "digression_timer_data";

const loadFromStorage = (): DigressionTimerData => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data === null) return {...defaultData};
    try {
        const parsed = JSON.parse(data) as Partial<DigressionTimerData>;
        const restored: DigressionTimerData = {
            lecturerName: typeof parsed.lecturerName === "string" ? parsed.lecturerName : "",
            timeElapsed: Number.isFinite(parsed.timeElapsed) ? Number(parsed.timeElapsed) : 0,
            running: Boolean(parsed.running),
            lastSavedAt: Number.isFinite(parsed.lastSavedAt) ? Number(parsed.lastSavedAt) : null,
            videoIndex:
                typeof parsed.videoIndex === "number" &&
                parsed.videoIndex >= 0 &&
                parsed.videoIndex < VIDEOS.length
                    ? parsed.videoIndex
                    : 0,
        };

        if (
            restored.running &&
            restored.lastSavedAt !== null
        ) {
            restored.timeElapsed += Date.now() - restored.lastSavedAt;
        }
        return restored;
    } catch {
        return {...defaultData};
    }
};

const saveToStorage = (data: DigressionTimerData) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
};

const DigressionTimer = ({title, isPreview}: WidgetProps) => {
    const [initialData] = useState(() => loadFromStorage());
    const [inFullscreen, setInFullscreen] = useState(false);
    const [text, setText] = useState(initialData.lecturerName);
    const [elapsed, setElapsed] = useState(initialData.timeElapsed);
    const [running, setRunning] = useState(initialData.running);
    const [videoIndex, setVideoIndex] = useState(initialData.videoIndex);

    const videoRef = useRef<HTMLVideoElement>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const elapsedRef = useRef(initialData.timeElapsed);
    const textRef = useRef(initialData.lecturerName);
    const runningRef = useRef(initialData.running);
    const videoIndexRef = useRef(initialData.videoIndex);
    const baseElapsedRef = useRef(initialData.timeElapsed);
    const skipRunningSave = useRef(true);

    // Keep refs in sync for unmount / interval saves
    // eslint-disable-next-line react-hooks/refs
    elapsedRef.current = elapsed;
    // eslint-disable-next-line react-hooks/refs
    textRef.current = text;
    // eslint-disable-next-line react-hooks/refs
    runningRef.current = running;
    // eslint-disable-next-line react-hooks/refs
    videoIndexRef.current = videoIndex;

    const persist = (
        currentText = textRef.current,
        currentElapsed = elapsedRef.current,
        currentRunning = runningRef.current,
        currentVideoIndex = videoIndexRef.current,
    ) => {
        saveToStorage({
            lecturerName: currentText,
            timeElapsed: currentElapsed,
            running: currentRunning,
            lastSavedAt: Date.now(),
            videoIndex: currentVideoIndex,
        });
    };

    useEffect(() => {
        const flush = () => persist();
        const onVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                flush();
            }
        };
        window.addEventListener("pagehide", flush);
        document.addEventListener("visibilitychange", onVisibilityChange);
        return () => {
            window.removeEventListener("pagehide", flush);
            document.removeEventListener("visibilitychange", onVisibilityChange);
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            persist();
        };
    }, []);

    useEffect(() => {
        if (running) {
            const startedAt = Date.now();
            const base = baseElapsedRef.current;
            intervalRef.current = setInterval(() => {
                setElapsed(base + (Date.now() - startedAt));
            }, 10);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [running]);

    useEffect(() => {
        if (skipRunningSave.current) {
            skipRunningSave.current = false;
            return;
        }
        persist(textRef.current, elapsedRef.current, running, videoIndexRef.current);
    }, [running]);

    useEffect(() => {
        if (!running) return;
        const saveInterval = setInterval(() => {
            persist();
        }, 1000);
        return () => clearInterval(saveInterval);
    }, [running]);

    useEffect(() => {
        persist(textRef.current, elapsedRef.current, runningRef.current, videoIndex);
    }, [videoIndex]);

    const togglePlay = () => {
        const video = videoRef.current;
        if (running) {
            baseElapsedRef.current = elapsedRef.current;
            setRunning(false);
            video?.pause();
        } else {
            setRunning(true);
            void video?.play().catch(() => undefined);
        }
    };

    const handleReset = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        baseElapsedRef.current = 0;
        setRunning(false);
        setElapsed(0);
        setText("");
        videoRef.current?.pause();
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        videoIndexRef.current = videoIndex;
        persist("", 0, false, videoIndex);
    };

    const handleTextChange = (value: string) => {
        setText(value);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            persist(value, elapsedRef.current, runningRef.current, videoIndexRef.current);
        }, 500);
    };

    const handleLoaded = () => {
        const video = videoRef.current;
        if (!video) return;
        if (runningRef.current) {
            void video.play().catch(() => undefined);
        } else {
            video.pause();
        }
    };

    const switchVideo = (direction: -1 | 1) => {
        setVideoIndex((current) => (current + direction + VIDEOS.length) % VIDEOS.length);
    };

    if (isPreview) {
        return <>
            <div className="digression-widget-preview">
                <video
                    src={VIDEOS[0]}
                    loop
                    muted
                    playsInline
                />
            </div>
            <h3 className="widget-title-preview">{title}</h3>
        </>
    }

    const getComponent = () => (
        <div className={`digression-timer-widget ${inFullscreen ? "fullscreen" : ""}`}>
            <div className="digression-video-layer">
                <video
                    key={VIDEOS[videoIndex]}
                    ref={videoRef}
                    src={VIDEOS[videoIndex]}
                    onLoadedMetadata={handleLoaded}
                    loop
                    muted
                    playsInline
                />
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
            </div>

            <div className="widget-header">
                <Fullscreen
                    className="widget-header-icon"
                    size={20}
                    onClick={() => setInFullscreen(!inFullscreen)}
                />
            </div>

            <button
                type="button"
                className="digression-carousel-btn digression-carousel-btn--prev"
                onClick={() => switchVideo(-1)}
                aria-label="Vorheriges Video"
            >
                <ChevronLeft size={28} />
            </button>
            <button
                type="button"
                className="digression-carousel-btn digression-carousel-btn--next"
                onClick={() => switchVideo(1)}
                aria-label="Nächstes Video"
            >
                <ChevronRight size={28} />
            </button>

            <div className="digression-video-buttons">
                <Button
                    text={running ? "Pause" : "Start"}
                    onClick={togglePlay}
                    type="submit"
                    variant="primary"
                    fullWidth={true}
                />
                <Button
                    text={"Reset"}
                    onClick={handleReset}
                    type="reset"
                    variant="secondary"
                    fullWidth={true}
                />
            </div>
        </div>
    );

    return inFullscreen
        ? createPortal(getComponent(), document.body)
        : getComponent();
};

export default DigressionTimer;
