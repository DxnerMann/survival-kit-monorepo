import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { EventContentArg, EventHoveringArg } from "@fullcalendar/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import deLocale from "@fullcalendar/core/locales/de";
import type { Lecture } from "../models/Lecture.tsx";
import { lectureConvertionUtil } from "../services/lectureConvertionUtil.tsx";
import LectureTooltip from "./LectureTooltip";
import "./LectureCalendar.css";

interface LectureCalendarProps {
    lectures: Lecture[];
    weekOffset: number;
    colorLecture?: string;
    colorExam?: string;
    colorOther?: string;
}

interface TooltipState {
    lecture: Lecture;
    x: number;
    y: number;
}

const EventCard = ({ arg }: { arg: EventContentArg }) => {
    const lecture = arg.event.extendedProps["lecture"] as Lecture;
    const textColor = arg.event.extendedProps["textColor"] as string;
    return (
        <div className="lc-event" style={{ color: textColor }}>
            <span className="lc-event__title">{lecture.title}</span>
            {lecture.lecturer && <span className="lc-event__meta">{lecture.lecturer}</span>}
            {lecture.rooms.length > 0 && <span className="lc-event__meta">{lecture.rooms.join(", ")}</span>}
        </div>
    );
};

const LectureCalendar = ({
                             lectures,
                             weekOffset,
                             colorLecture = "#6a0000",
                             colorExam    = "#ff0000",
                             colorOther   = "#c8c8b9",
                         }: LectureCalendarProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [tooltip, setTooltip]       = useState<TooltipState | null>(null);
    const [slotHeight, setSlotHeight] = useState(40);

    useEffect(() => {
        const updateHeight = () => {
            const parent = containerRef.current?.parentElement;
            if (!parent) return;
            const available  = parent.clientHeight * 0.9;
            const headerHeight = 37;
            const slots      = 23;
            const computed   = Math.floor((available - headerHeight) / slots);
            setSlotHeight(Math.max(20, computed));
        };

        updateHeight();
        const ro = new ResizeObserver(updateHeight);
        if (containerRef.current?.parentElement) ro.observe(containerRef.current.parentElement);
        return () => ro.disconnect();
    }, []);

    const colors: Record<Lecture["type"], string> = {
        LECTURE: colorLecture,
        EXAM:    colorExam,
        OTHER:   colorOther,
    };

    const showSaturday = useMemo(() => lectures.some(l => l.day === "SATURDAY"), [lectures]);
    const monday       = useMemo(() => lectureConvertionUtil.getMonday(weekOffset), [weekOffset]);
    const events       = useMemo(
        () => lectureConvertionUtil.toCalendarEvents(lectures, colors, weekOffset),
        [lectures, weekOffset, colorLecture, colorExam, colorOther]
    );

    const handleMouseEnter = (info: EventHoveringArg) => {
        const lecture = info.event.extendedProps["lecture"] as Lecture;
        const rect    = info.el.getBoundingClientRect();
        setTooltip({ lecture, x: rect.left + rect.width / 2, y: rect.top });
    };

    return (
        <div
            className="lecture-calendar"
            ref={containerRef}
            style={{ "--fc-slot-height": `${slotHeight}px` } as React.CSSProperties}
        >
            <FullCalendar
                key={`${weekOffset}-${events.map(e => e.title).join()}`}
                plugins={[timeGridPlugin]}
                initialView="timeGridWeek"
                initialDate={monday}
                locale={deLocale}
                headerToolbar={false}
                allDaySlot={false}
                slotMinTime="08:00:00"
                slotMaxTime="19:00:00"
                slotDuration="00:30:00"
                slotLabelInterval="01:00:00"
                slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
                dayHeaderFormat={{ weekday: "short", day: "2-digit", month: "2-digit" }}
                firstDay={1}
                weekends={showSaturday}
                hiddenDays={showSaturday ? [0] : [0, 6]}
                expandRows={false}
                height="auto"
                eventOverlap={false}
                slotEventOverlap={false}
                initialEvents={events}
                eventContent={(arg: EventContentArg) => <EventCard arg={arg} />}
                eventMouseEnter={handleMouseEnter}
                eventMouseLeave={() => setTooltip(null)}
            />

            {tooltip && createPortal(
                <LectureTooltip lecture={tooltip.lecture} x={tooltip.x} y={tooltip.y} />,
                document.body
            )}
        </div>
    );
};

export default LectureCalendar;