import "@/components/widgets/lecture-timer/LectureTimer.css";
import {dashboardService} from "@/services/dashboardService.tsx";
import type {WidgetProps} from "@/models/WidgetProps.tsx";
import {type CSSProperties, type RefObject, useEffect, useId, useRef, useState} from "react";
import {Fullscreen, Settings} from "lucide-react";
import {createPortal} from "react-dom";
import {getUserRole} from "@/services/tokenService.tsx";
import {lectureService, useTimerCourse} from "@/services/lectureService.tsx";
import type {Lecture} from "@/models/Lecture.tsx";
import ProgressBar from 'react-customizable-progressbar';
import ColorPicker from "@/components/ui/ColorPicker.tsx";
import Button from "@/components/ui/Button.tsx";
import Toggle from "@/components/ui/Toggle.tsx";
import WidgetStatus from "@/components/ui/WidgetStatus.tsx";

interface LectureTimerData {
    strokeColor: string,
    showPercentage: boolean,
    showCountdown: boolean
}

const defaultData : LectureTimerData = {
    strokeColor: "#ff0000",
    showPercentage: true,
    showCountdown: true
}

const lectureLabel = (title: string) => {
    const short = title.replace(/\s*<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return short || title;
};

type LectureTimerRingProps = {
    progress: number;
    strokeColor: string;
    ringStyle: CSSProperties;
    showPercentage: boolean;
    showCountdown: boolean;
    percentage: number;
    countdown: string;
};

const LectureTimerRing = ({
    progress,
    strokeColor,
    ringStyle,
    showPercentage,
    showCountdown,
    percentage,
    countdown,
}: LectureTimerRingProps) => {
    const slotRef = useRef<HTMLDivElement>(null);
    const [available, setAvailable] = useState(0);

    useEffect(() => {
        const element = slotRef.current;
        if (!element) {
            return;
        }
        const measure = (entry: ResizeObserverEntry) => {
            const box = entry.contentRect;
            setAvailable(Math.max(0, Math.floor(Math.min(box.width, box.height))));
        };
        const observer = new ResizeObserver(([entry]) => measure(entry));
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const stroke = Math.min(34, Math.max(8, available * 0.07));
    const track = stroke * 0.84;
    const radius = Math.max(0, (available - stroke * 2) / 2);

    return (
        <div className="lecture-timer-ring-slot" ref={slotRef}>
            {radius > 8 && (
                <div className="lecture-timer-ring" style={ringStyle}>
                    <ProgressBar
                        className="progress-bar"
                        radius={radius}
                        strokeWidth={stroke}
                        trackStrokeWidth={track}
                        pointerRadius={0}
                        pointerStrokeWidth={0}
                        progress={progress}
                        strokeColor={strokeColor}
                    >
                        <div className="progress-bar-center">
                            {showPercentage && (
                                <div className="percentage" style={{fontSize: Math.max(13, available * 0.09)}}>
                                    {Math.floor(percentage)}%
                                </div>
                            )}
                            {showCountdown && (
                                <div className="countdown" style={{fontSize: Math.max(12, available * 0.062)}}>
                                    {countdown}
                                </div>
                            )}
                        </div>
                    </ProgressBar>
                </div>
            )}
        </div>
    );
};

const LectureTimer = ({title, data, id, isPreview} : WidgetProps) => {

    const LOCAL_STORAGE_KEY = "lecture-timer-settings"

    const [inFullscreen, setInFullscreen] = useState(false);
    const [inSettings, setInSettings] = useState(false);
    const [decodedData, setDecodedData] = useState<LectureTimerData>(() => {
        try {
            if (getUserRole() !== "GUEST") {
                if (data === "") {
                    return defaultData;
                }
                return JSON.parse(data);
            } else {
                const cookieData = localStorage.getItem(LOCAL_STORAGE_KEY)
                if (cookieData) {
                    return JSON.parse(cookieData);
                } else   {
                    return defaultData;
                }
            }
        } catch {
            return defaultData;
        }
    });
    const course = useTimerCourse();
    const { current, next, loading, error } = lectureService.useCurrentAndNextLecture(isPreview ? null : course);

    const containerRef = useRef<HTMLDivElement>(null);
    const gradientId = `lecture-ring-${useId().replace(/:/g, "")}`;
    const ringStyle = {"--lecture-timer-stroke": `url(#${gradientId})`} as CSSProperties;
    const accentGradient = (
        <svg className="lecture-timer-gradient-def" aria-hidden="true" focusable="false">
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" />
                    <stop offset="100%" stopColor="var(--accent-2)" />
                </linearGradient>
            </defs>
        </svg>
    );
    const useContainerSize = (ref: RefObject<HTMLElement | null>, dep?: unknown) => {
        const [size, setSize] = useState(0);

        useEffect(() => {
            if (!ref.current) return;
            const observer = new ResizeObserver(([entry]) => {
                if (entry.contentRect.width <= entry.contentRect.height) {
                    setSize(entry.contentRect.width);
                } else {
                    setSize(entry.contentRect.height)
                }
            });
            observer.observe(ref.current);
            return () => observer.disconnect();
        }, [ref, dep]);

        return size;
    };
    // eslint-disable-next-line react-hooks/refs
    const size = useContainerSize(containerRef, inFullscreen);

    const [now, setNow] = useState(lectureService.getNow());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(lectureService.getNow());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const parseMinutes = (time: string) => {
        const [h, m] = time.split(":").map(Number);
        return h * 60 + m;
    };

    const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

    const lectureProgress = (lecture: Lecture) => {
        const startMinutes = parseMinutes(lecture.startTime);
        const endMinutes = parseMinutes(lecture.endTime);
        const totalMinutes = endMinutes - startMinutes;
        const elapsedMinutes = nowMinutes - startMinutes;
        const percentage = totalMinutes > 0 ? Math.min(100, Math.max(0, (elapsedMinutes / totalMinutes) * 100)) : 0;
        const remainingSeconds = Math.max(0, Math.round((endMinutes - nowMinutes) * 60));
        const countdown = `${String(Math.floor(remainingSeconds / 3600)).padStart(2, "0")}:${String(Math.floor((remainingSeconds % 3600) / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;
        return {percentage, countdown};
    };
    const [selectedColor, setSelectedColor] = useState(decodedData.strokeColor);
    const [showPercentage, setShowPercentage] = useState(decodedData.showPercentage);
    const [showCountdown, setShowCountdown] = useState(decodedData.showCountdown);

    function saveSettings() {
        setDecodedData(prev => {
            const updated = {
                ...prev,
                strokeColor: selectedColor,
                showPercentage: showPercentage,
                showCountdown: showCountdown
            };

            try {
                if (getUserRole() !== "GUEST") {
                    dashboardService.saveWidgetData(id, JSON.stringify(updated));
                } else {
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
                }
                setInSettings(false);
            } catch (e) {
                throw new Error("Error while trying to parse data for " + title, { cause: e });
            }

            return updated;
        });
    }

    const onColorValueChange = (hex: string)=> {
        setSelectedColor(hex)
    }

    const groupedLectures = next?.reduce((acc, lecture) => {
        if (!lectureService.isToday(lecture.day) && !lectureService.isTomorrow(lecture.day)) return acc;
        const key = lectureService.isToday(lecture.day) ? "Heute" : "Morgen";
        if (!acc[key]) acc[key] = [];
        acc[key].push(lecture);
        return acc;
    }, {} as Record<string, typeof next>);


    if (isPreview) {
        return <>
            <div className="lecture-timer-widget-preview" ref={containerRef}>
                {accentGradient}
                <div className="lecture-timer-ring" style={ringStyle}>
                    <ProgressBar
                        className="progress-bar"
                        radius={inFullscreen ? (size / 5) : (size / 3)}
                        strokeWidth={inFullscreen ? 50 : 25}
                        trackStrokeWidth={inFullscreen ? 45 : 20}
                        progress={0}
                        strokeColor={decodedData.strokeColor}
                    />
                </div>
            </div>
            <h3 className="widget-title-preview">{title}</h3>
        </>

    }

    const getWidgetContent = () => (
        <div className={`lecture-timer-widget ${inFullscreen ? "fullscreen" : ""}`} ref={containerRef} >
            {accentGradient}
            <div className="widget-header">
                {!inSettings && <Settings
                     className="widget-header-icon"
                     size={20}
                     onClick={() => setInSettings(!inSettings)}
                />}
                <Fullscreen
                    className="widget-header-icon"
                    size={20}
                    onClick={() => setInFullscreen(!inFullscreen)}
                />
            </div>
            {
                inSettings
                    ? <div className="settings-content">
                        <div className="settings-content-wrapper">
                            <p className="widget-settings-heading">Farbe</p>
                            <ColorPicker startValue={decodedData.strokeColor} onChange={(hex) => onColorValueChange(hex)} label="" key="LECTURE" />
                            <p className="widget-settings-heading">Anzeige</p>
                            <div className="lecture-timer-toggles">
                                <Toggle
                                    checked={showCountdown}
                                    onChange={setShowCountdown}
                                    label="Countdown anzeigen"
                                />
                                <Toggle
                                    checked={showPercentage}
                                    onChange={setShowPercentage}
                                    label="Prozent anzeigen"
                                />
                            </div>
                        </div>
                        <div className="widget-settings-buttons">
                            <Button text={"Zurück"} onClick={() => setInSettings(false)} variant="secondary" type="reset" fullWidth={true} />
                            <Button text={"Speichern"} onClick={() => saveSettings()} variant="primary" type="submit" fullWidth={true} />
                        </div>
                    </div>
                    : <div className="widget-content">
                        {
                            loading
                                ? <WidgetStatus status="loading" />
                                : error
                                    ? <WidgetStatus status="error" message={error} />
                                    : current.length > 0
                                        ? <div className={`lecture-timer-current-lectures${current.length > 1 ? " multiple" : ""}`}>
                                            {current.map(lecture => {
                                                const {percentage, countdown} = lectureProgress(lecture);
                                                const label = lectureLabel(lecture.title);
                                                return <div key={`${lecture.title}-${lecture.startTime}`} className="lecture-timer-current-lecture">
                                                    <div className="lecture-timer-lecture-title" title={lecture.title}>{label}</div>
                                                    <div className="lecture-timer-lecture-info" title={lecture.lecturer}>{lecture.lecturer}</div>
                                                    <div className="lecture-timer-lecture-info">{lecture.rooms.join(", ")}</div>
                                                    <LectureTimerRing
                                                        progress={percentage}
                                                        strokeColor={decodedData.strokeColor}
                                                        ringStyle={ringStyle}
                                                        showPercentage={decodedData.showPercentage}
                                                        showCountdown={decodedData.showCountdown}
                                                        percentage={percentage}
                                                        countdown={countdown}
                                                    />
                                                </div>;
                                            })}
                                        </div>
                                        : <><span className="no-lecture-heading">Aktuell keine Vorlesung.</span>
                                            {next && next.length === 0 && <span className="no-lecture-heading-2">Keine Weiteren Vorlesungen in dieser Woche</span>}
                                            {next && next.length !== 0 && <div className="lecture-timer-no-lecture">
                                                {Object.entries(groupedLectures ?? {}).map(([label, lectures]) => (
                                                    <div key={label} className="lecture-timer-day-group">
                                                        <span className="day-label">{label}</span>
                                                        {lectures.map(lecture => (
                                                            <div key={lecture.title + "-" + lecture.startTime} className="lecture-timer-next-lecture-info">
                                                                <span className="title" title={lecture.title}>{lectureLabel(lecture.title)}</span>
                                                                <div className="meta">
                                                                    {lecture.startTime} – {lecture.endTime}
                                                                </div>
                                                                <span className="rooms">{lecture.rooms}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>}</>
                        }
                    </div>
            }
        </div>
    );

    return inFullscreen
        ? createPortal(getWidgetContent(), document.body)
        : getWidgetContent();

}

export default LectureTimer;