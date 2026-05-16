import './Clock.css';
import {dashboardService} from "../../../services/dashboardService.tsx";
import type {WidgetProps} from "../../../models/WidgetProps.tsx";
import {useEffect, useState} from "react";
import {Clock1, Fullscreen} from "lucide-react";
import {createPortal} from "react-dom";
import {getUserRole} from "../../../services/tokenService.tsx";
import {lectureService} from "../../../services/lectureService.tsx";

interface ClockData {
    color: string,
    digital: boolean
}

const defaultData : ClockData = {
    color: "#ff0000",
    digital: true
}

const Clock = ({title, data, id, isPreview} : WidgetProps) => {

    const [inFullscreen, setInFullscreen] = useState(false);
    const [decodedData, setDecodedData] = useState<ClockData>(() => {
        try {
            if (getUserRole() !== "GUEST") {
                if (data === "") {
                    return defaultData;
                }
                return JSON.parse(data);
            }
            return defaultData;
        } catch {
            return defaultData;
        }
    });

    const [time, setTime] = useState<Date>(lectureService.getNow());

    useEffect(() => {
        const id = setInterval(() => setTime(lectureService.getNow()), 200);
        return () => clearInterval(id);
    }, []);


    const updateData = (partial: Partial<ClockData>) => {
        setDecodedData(prev => ({ ...prev, ...partial }));
    };

    function saveSettings() {
        try {
            if (getUserRole() !== "GUEST") {
                dashboardService.saveWidgetData(id, JSON.stringify(decodedData));
                return;
            }
            return;
        } catch (e) {
            throw new Error("Error while trying to Parse data for " + title, { cause: e });
        }

    }

    useEffect(() => {
        saveSettings();
    }, [decodedData]);

    function toggleClockMode() {
        updateData({
            digital: !decodedData.digital
        });
    }



    const DE_DAYS = [
        "Sonntag", "Montag", "Dienstag", "Mittwoch",
        "Donnerstag", "Freitag", "Samstag",
    ];
    const DE_MONTHS = [
        "Januar", "Februar", "März", "April", "Mai", "Juni",
        "Juli", "August", "September", "Oktober", "November", "Dezember",
    ];

    function pad(n: number) {
        return String(n).padStart(2, "0");
    }

    const TICKS = Array.from({ length: 60 }, (_, i) => {
        const angle = (i * 6 * Math.PI) / 180;
        const isHour = i % 5 === 0;
        const r1 = isHour ? 68 : 73;
        const r2 = 78;
        return {
            x1: 90 + r1 * Math.sin(angle),
            y1: 90 - r1 * Math.cos(angle),
            x2: 90 + r2 * Math.sin(angle),
            y2: 90 - r2 * Math.cos(angle),
            isHour,
        };
    });

    function AnalogClock() {
        const h = time.getHours();
        const m = time.getMinutes();
        const s = time.getSeconds();
        const ms = time.getMilliseconds();

        const secDeg = (s + ms / 1000) * 6;
        const minDeg = (m + s / 60) * 6;
        const hrDeg  = ((h % 12) + m / 60) * 30;

        return (
            <div className="analog-clock">
                <svg
                    className="analog-clock__svg"
                    viewBox="0 0 180 180"
                    aria-hidden="true"
                >
                    <circle className="analog-clock__face" cx="90" cy="90" r="86" />
                    <circle className="analog-clock__ring" cx="90" cy="90" r="80" />

                    {TICKS.map((t, i) => (
                        <line
                            key={i}
                            className={`analog-clock__tick${t.isHour ? " analog-clock__tick--hour" : ""}`}
                            x1={t.x1} y1={t.y1}
                            x2={t.x2} y2={t.y2}
                        />
                    ))}

                    {[
                        { label: "12", x: 90,  y: 22  },
                        { label: "3",  x: 158, y: 93  },
                        { label: "6",  x: 90,  y: 163 },
                        { label: "9",  x: 22,  y: 93  },
                    ].map(({ label, x, y }) => (
                        <text
                            key={label}
                            className="analog-clock__numeral"
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                        >
                            {label}
                        </text>
                    ))}

                    <line
                        className="analog-clock__hand analog-clock__hand--hour"
                        x1="90" y1="90" x2="90" y2="44"
                        transform={`rotate(${hrDeg}, 90, 90)`}
                    />
                    <line
                        className="analog-clock__hand analog-clock__hand--minute"
                        x1="90" y1="90" x2="90" y2="20"
                        transform={`rotate(${minDeg}, 90, 90)`}
                    />
                    <line
                        className="analog-clock__hand analog-clock__hand--second"
                        x1="90" y1="100" x2="90" y2="16"
                        transform={`rotate(${secDeg}, 90, 90)`}
                    />

                    <circle className="analog-clock__center-outer" cx="90" cy="90" r="3.5" />
                    <circle className="analog-clock__center-inner" cx="90" cy="90" r="1.5" />
                </svg>
            </div>
        );
    }

    function DigitalClock() {
        const h = pad(time.getHours());
        const m = pad(time.getMinutes());
        const s = pad(time.getSeconds());
        const dayName = DE_DAYS[time.getDay()];
        const day = time.getDate();
        const month = DE_MONTHS[time.getMonth()];
        const year = time.getFullYear();

        return (
            <div className="digital-clock">
                <span className="digital-clock__time">{h}:{m}:{s}</span>
                <span className="digital-clock__date">
        {dayName}, {day}. {month} {year}
      </span>
            </div>
        );
    }


    if (isPreview) {
        return <>
            <div className="lecture-plan-widget-preview">
                {DigitalClock()}
            </div>
            <h3 className="widget-title-preview">{title}</h3>
        </>

    }

    const getWidgetContent = () => (
        <div className={`lecture-plan-widget ${inFullscreen ? "fullscreen" : ""}`}>
            <div className="widget-header">
                {<Clock1
                     className="widget-header-icon"
                     size={20}
                     onClick={() => toggleClockMode()}
                />}
                <Fullscreen
                    className="widget-header-icon"
                    size={20}
                    onClick={() => setInFullscreen(!inFullscreen)}
                />
            </div>
            {
                decodedData.digital
                    ? <div className="digital-clock">
                        <DigitalClock />
                    </div>
                    : <div className="analog-clock">
                        <AnalogClock />
                    </div>
            }
        </div>
    );

    return inFullscreen
        ? createPortal(getWidgetContent(), document.body)
        : getWidgetContent();

}

export default Clock;