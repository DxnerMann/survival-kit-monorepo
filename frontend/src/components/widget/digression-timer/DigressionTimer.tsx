import './DigressionTimer.css';
import {Fullscreen} from "lucide-react";
import {useEffect, useRef, useState} from "react";
import type {WidgetProps} from "../../../models/WidgetProps.tsx";
import {getUserRole} from "../../../services/tokenService.tsx";
import Button from "../../shared/Button.tsx";
import {createPortal} from "react-dom";
import {dashboardService} from "../../../services/dashboardService.tsx";

interface DigressionTimerData {
    lecturerName: string,
    timeElapsed: number
}

const defaultData : DigressionTimerData = {
    lecturerName: "",
    timeElapsed: 0
}

const DigressionTimer = ({title, data, id, isPreview} : WidgetProps) => {
    const [inFullscreen, setInFullscreen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [text, setText] = useState("");
    const [elapsed, setElapsed] = useState(0);       // ms
    const [running, setRunning] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [decodedData, setDecodedData] = useState<DigressionTimerData>(() => {
        try {
            if (getUserRole() !== "GUEST") {
                if (data === "") {
                    return defaultData;
                }
                return JSON.parse(data);
            } else {
                return defaultData;
            }
        } catch {
            return defaultData;
        }
    });

    useEffect(() => {
        if (running) {
            intervalRef.current = setInterval(() => {
                setElapsed((prev) => prev + 10);
            }, 10);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [running]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setText(decodedData.lecturerName);
        setElapsed(decodedData.timeElapsed);
    }, [decodedData.lecturerName, decodedData.timeElapsed]);

    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, []);

    const togglePlay = () => {
        const video = videoRef.current;

        if (running) {
            setRunning(false);
            if (video) video.pause();
        } else {
            setRunning(true);
            if (video) video.play();
        }

    }
    const handleReset = () => {
        setRunning(false);
        setElapsed(0);
        setText("");
        const video = videoRef.current;
        if (video) video.pause();
    };

    const handleTextChange = (value: string) => {
        setText(value);

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            saveSettings();
        }, 500);
    };

    function saveSettings() {
        setDecodedData(prev => {
            const updated = {
                ...prev,
                lecturerName: text,
                timeElapsed: elapsed
            };
            try {
                dashboardService.saveWidgetData(id, JSON.stringify(updated));
            } catch (e) {
                throw new Error("Error while trying to parse data for " + title, { cause: e });
            }
            return updated;
        });
    }

    const handleLoaded = () => {
        videoRef.current?.pause();
    };


    const formatTime = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const centiseconds = Math.floor((ms % 1000) / 10);
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
    };

    if (isPreview) {
        return <>
            <div className="digression-widget-preview">
                <video
                    ref={videoRef}
                    src="/videos/digression.mp4"
                    onLoadedMetadata={() => handleLoaded()}
                    loop
                    muted
                    playsInline
                />
            </div>
            <h3 className="widget-title-preview">{title}</h3>
        </>

    }

    const getComponent = ()  => {
        return <div className={`digression-timer-widget ${inFullscreen ? "fullscreen" : ""}`}>
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
                            onChange={(event) => handleTextChange(event.target.value)}
                            placeholder="<Caption>"
                        />
                        <h3 className="digression-video-timer">{"SEIT " +  formatTime(elapsed)}</h3>
                    </div>
                    <video
                        ref={videoRef}
                        src="/videos/digression.mp4"
                        onLoadedMetadata={() => handleLoaded()}
                        loop
                        muted
                        playsInline
                    />
                </div>
                <div className="digression-video-buttons">
                    <Button text={running ? "Pause" : "Start"} onClick={() => togglePlay()} type="submit" variant="secondary" fullWidth={true} />
                    <Button text={"Reset"} onClick={() => handleReset()} type="reset" variant="primary" fullWidth={true} />
                </div>
            </div>
        </div>
    }

    return <>
        { inFullscreen && createPortal(getComponent(), document.body) }
        { !inFullscreen && getComponent() }
    </>
}

export default DigressionTimer;