import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { EventContentArg, EventHoveringArg } from "@fullcalendar/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import deLocale from "@fullcalendar/core/locales/de";
import type { Lecture } from "@/models/Lecture.tsx";
import type { CustomEvent } from "@/models/CustomEvent.tsx";
import { DEFAULT_CUSTOM_EVENT_COLOR } from "@/models/CustomEvent.tsx";
import { lectureConversionUtil } from "@/services/lectureConversionUtil.tsx";
import { customEventToLecture, customEventsInRange, customEventsToCalendar, weekDateRange } from "@/services/customEventService.tsx";
import LectureTooltip from "@/components/lecture/LectureTooltip";
import "@/components/lecture/LectureCalendar.css";

interface LectureCalendarProps {
    lectures: Lecture[];
    weekOffset: number;
    colorLecture?: string;
    colorExam?: string;
    colorOther?: string;
    customEvents?: CustomEvent[];
    colorCustom?: string;
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

const minutesOf = (time: string) => {
    const [hours = 0, minutes = 0] = time.split(":").map(Number);
    return hours * 60 + minutes;
};

const clock = (totalMinutes: number) => {
    const bounded = Math.min(24 * 60, Math.max(0, totalMinutes));
    const hours = Math.floor(bounded / 60);
    const minutes = bounded % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
};

const LectureCalendar = ({
                             lectures,
                             weekOffset,
                             colorLecture = "#6a0000",
                             colorExam    = "#ff0000",
                             colorOther   = "#c8c8b9",
                             customEvents = [],
                             colorCustom = DEFAULT_CUSTOM_EVENT_COLOR,
                         }: LectureCalendarProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [tooltip, setTooltip]       = useState<TooltipState | null>(null);
    const [slotHeight, setSlotHeight] = useState(40);
    const visibleCustom = useMemo(() => {
        const range = weekDateRange(weekOffset);
        return customEventsInRange(customEvents, range.start, range.end);
    }, [customEvents, weekOffset]);
    const timeRange = useMemo(() => {
        let min = 8 * 60;
        let max = 19 * 60;
        for (const event of visibleCustom) {
            min = Math.min(min, Math.floor(minutesOf(event.startTime) / 60) * 60);
            max = Math.max(max, Math.ceil(minutesOf(event.endTime) / 60) * 60);
        }
        if (max <= min) {
            max = Math.min(24 * 60, min + 60);
        }
        return {min: clock(min), max: clock(max)};
    }, [visibleCustom]);
    const slotCount = timeRange.min === "08:00:00" && timeRange.max === "19:00:00"
        ? 23
        : Math.max(1, (minutesOf(timeRange.max) - minutesOf(timeRange.min)) / 30);

    useEffect(() => {
        const updateHeight = () => {
            const parent = containerRef.current?.parentElement;
            if (!parent) return;
            const available  = parent.clientHeight * 0.9;
            const headerHeight = 37;
            const computed   = Math.floor((available - headerHeight) / slotCount);
            setSlotHeight(Math.max(20, computed));
        };

        updateHeight();
        const ro = new ResizeObserver(updateHeight);
        if (containerRef.current?.parentElement) ro.observe(containerRef.current.parentElement);
        return () => ro.disconnect();
    }, [slotCount]);

    const showSaturday = useMemo(
        () => lectures.some(lecture => lecture.day === "SATURDAY")
            || visibleCustom.some(event => customEventToLecture(event).day === "SATURDAY"),
        [lectures, visibleCustom]
    );
    const showSunday = useMemo(
        () => lectures.some(lecture => lecture.day === "SUNDAY")
            || visibleCustom.some(event => customEventToLecture(event).day === "SUNDAY"),
        [lectures, visibleCustom]
    );
    const monday       = useMemo(() => lectureConversionUtil.getMonday(weekOffset), [weekOffset]);
    const events       = useMemo(
        () => {
            const colors: Record<Lecture["type"], string> = {
                LECTURE: colorLecture,
                EXAM: colorExam,
                OTHER: colorOther,
                CUSTOM: colorCustom,
            };
            return [
                ...lectureConversionUtil.toCalendarEvents(lectures, colors, weekOffset),
                ...customEventsToCalendar(visibleCustom, colorCustom),
            ];
        },
        [lectures, weekOffset, colorLecture, colorExam, colorOther, colorCustom, visibleCustom]
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
                key={`${weekOffset}-${timeRange.min}-${timeRange.max}-${events.map(event => `${event.title}-${event.start}`).join()}`}
                plugins={[timeGridPlugin]}
                initialView="timeGridWeek"
                initialDate={monday}
                locale={deLocale}
                headerToolbar={false}
                allDaySlot={false}
                slotMinTime={timeRange.min}
                slotMaxTime={timeRange.max}
                slotDuration="00:30:00"
                slotLabelInterval="01:00:00"
                slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
                dayHeaderFormat={{ weekday: "short", day: "2-digit", month: "2-digit" }}
                firstDay={1}
                weekends={showSaturday || showSunday}
                hiddenDays={[...(showSunday ? [] : [0]), ...(showSaturday ? [] : [6])]}
                expandRows={false}
                height="auto"
                eventOverlap={false}
                slotEventOverlap={false}
                eventMinHeight={0}
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