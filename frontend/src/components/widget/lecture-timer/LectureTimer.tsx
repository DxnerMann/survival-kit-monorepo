import './LectureTimer.css';
import {dashboardService} from "../../../services/dashboardService.tsx";
import type {WidgetProps} from "../../../models/WidgetProps.tsx";
import {type RefObject, useEffect, useRef, useState} from "react";
import {Fullscreen, Settings} from "lucide-react";
import {createPortal} from "react-dom";
import {getUserRole} from "../../../services/tokenService.tsx";
import {lectureService, useTimerCourse} from "../../../services/lectureService.tsx";
import ProgressBar from 'react-customizable-progressbar';
import ColorPicker from "../../shared/ColorPicker.tsx";
import Button from "../../shared/Button.tsx";

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
    const { current, next } = lectureService.useCurrentAndNextLecture(course);

    const containerRef = useRef<HTMLDivElement>(null);
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
    const startMinutes = current ? parseMinutes(current.startTime) : 0;
    const endMinutes = current ? parseMinutes(current.endTime) : 0;
    const totalMinutes = endMinutes - startMinutes;
    const elapsedMinutes = nowMinutes - startMinutes;

    const percentage = current ? Math.min(100, Math.max(0, (elapsedMinutes / totalMinutes) * 100)) : 0;

    const remainingSeconds = current ? Math.max(0, Math.round((endMinutes - nowMinutes) * 60)) : 0;
    const countdown = `${String(Math.floor(remainingSeconds / 3600)).padStart(2, "0")}:${String(Math.floor((remainingSeconds % 3600) / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;
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

    const onCheckboxChanged = (checked: boolean, key: "COUNTDOWN" | "PERCENTAGE")=> {
        switch (key) {
            case "COUNTDOWN":
                setShowCountdown(checked);
                break;
            case "PERCENTAGE":
                setShowPercentage(checked);
                break
        }
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
                <ProgressBar
                    className="progress-bar"
                    radius={inFullscreen ? (size / 5) : (size / 3)}
                    strokeWidth={inFullscreen ? 50 : 25}
                    trackStrokeWidth={inFullscreen ? 45 : 20}
                    progress={percentage}
                    strokeColor={decodedData.strokeColor}
                />
            </div>
            <h3 className="widget-title-preview">{title}</h3>
        </>

    }

    const getWidgetContent = () => (
        <div className={`lecture-timer-widget ${inFullscreen ? "fullscreen" : ""}`} ref={containerRef} >
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
                            <label className="selection-dropdown-item">
                                <input
                                    type="checkbox"
                                    checked={showCountdown}
                                    onChange={(event) => onCheckboxChanged(event.target.checked, "COUNTDOWN")}
                                />
                                <span>Countdown anzeigen</span>
                            </label>
                            <label className="selection-dropdown-item">
                                <input
                                    type="checkbox"
                                    checked={showPercentage}
                                    onChange={(event) => onCheckboxChanged(event.target.checked, "PERCENTAGE")}
                                />
                                <span>Prozent anzeigen</span>
                            </label>
                        </div>
                        <div className="widget-settings-buttons">
                            <Button text={"Zurück"} onClick={() => setInSettings(false)} variant="secondary" type="reset" fullWidth={true} />
                            <Button text={"Speichern"} onClick={() => saveSettings()} variant="primary" type="submit" fullWidth={true} />
                        </div>
                    </div>
                    : <div className="widget-content">
                        {
                            current
                            ? <div className="lecture-timer-current-lecture">
                                    <div className="lecture-timer-lecture-title" style={{ fontSize: inFullscreen ? (size / 30) : (size / 15) }}> {current.title}</div>
                                    <div className="lecture-timer-lecture-info" style={{ fontSize: inFullscreen ? (size / 35) : (size / 20) }}> {current.lecturer}</div>
                                    <div className="lecture-timer-lecture-info" style={{ fontSize: inFullscreen ? (size / 35) : (size / 20) }}> {current.rooms.join(",")}</div>
                                    <ProgressBar
                                        className="progress-bar"
                                        radius={inFullscreen ? (size / 5) : (size / 3)}
                                        strokeWidth={inFullscreen ? 50 : 25}
                                        trackStrokeWidth={inFullscreen ? 45 : 20}
                                        progress={percentage}
                                        strokeColor={decodedData.strokeColor}
                                    >
                                        <div className="progress-bar-center">
                                            {decodedData.showPercentage && (
                                                <div className="percentage" style={{ fontSize: inFullscreen ? (size / 30) : (size / 15) }}>{Math.floor(percentage)}%</div>
                                            )}
                                            {decodedData.showCountdown && (
                                                <div className="countdown" style={{ fontSize: inFullscreen ? (size / 35) : (size / 20) }}>{countdown}</div>
                                            )}
                                        </div>
                                    </ProgressBar>
                            </div>
                            : <><span className="no-lecture-heading">Aktuell keine Vorlesung.</span>
                                {next && next.length === 0 && <span className="no-lecture-heading-2">Keine Weiteren Vorlesungen in dieser Woche</span>}
                                {next && next.length !== 0 && <div className="lecture-timer-no-lecture">
                                    {Object.entries(groupedLectures ?? {}).map(([label, lectures]) => (
                                        <div key={label} className="lecture-timer-day-group">
                                            <span className="day-label">{label}</span>
                                            {lectures.map(lecture => (
                                                <div key={lecture.title + "-" + lecture.startTime} className="lecture-timer-next-lecture-info">
                                                    <span className="title">{lecture.title}</span>
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