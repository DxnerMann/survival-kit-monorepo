import "./LectureTooltip.css";
import type {Lecture} from "../models/Lecture.tsx";
import {Book, Clock1, MapPin, User} from "lucide-react";
import type {ReactNode} from "react";

interface LectureTooltipProps {
    lecture: Lecture;
    x: number;
    y: number;
}

const TYPE_LABELS: Record<Lecture["type"], string> = {
    LECTURE: "Vorlesung",
    EXAM:    "Prüfung",
    OTHER:   "Sonstiges",
};

const LectureTooltip = ({ lecture, x, y }: LectureTooltipProps) => (
    <div
        className="lc-tooltip"
        style={{ left: x, top: y }}
    >
        <div className="lc-tooltip__header">
            <span className="lc-tooltip__title">{lecture.title}</span>
            <span className="lc-tooltip__badge">{TYPE_LABELS[lecture.type]}</span>
        </div>

        <div className="lc-tooltip__body">
            <Row icon={<Clock1 size={10}/>} label="Zeit"     value={`${lecture.startTime} – ${lecture.endTime}`} />
            <Row icon={<User size={10} /> } label="Dozent"   value={lecture.lecturer || "—"} />
            <Row icon={<MapPin size={10} /> } label="Räume"    value={lecture.rooms.length ? lecture.rooms.join(", ") : "—"} />
            <Row icon={<Book size={10} /> } label="Kurse"    value={lecture.courses.length ? lecture.courses.join(", ") : "—"} />
        </div>
    </div>
);

const Row = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
    <div className="lc-tooltip__row">
        <span className="lc-tooltip__row-icon">{icon}</span>
        <span className="lc-tooltip__row-label">{label}</span>
        <span className="lc-tooltip__row-value">{value}</span>
    </div>
);

export default LectureTooltip;