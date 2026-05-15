import './LecturePlan.css';
import {dashboardService} from "../../../services/dashboardService.tsx";
import type {WidgetProps} from "../../../models/WidgetProps.tsx";
import {useEffect, useState} from "react";
import {Fullscreen, Settings} from "lucide-react";
import {createPortal} from "react-dom";
import {getUserRole} from "../../../services/tokenService.tsx";
import {lectureService} from "../../../services/lectureService.tsx";
import CourseSelection from "../../shared/CourseSelection.tsx";
import Button from "../../shared/Button.tsx";
import type {Lecture} from "../../../models/Lecture.tsx";
import LectureCalendar from "../../LectureCalendar.tsx";
import ColorPicker from "../../shared/ColorPicker.tsx";

interface LecturePlanData {
    lectureColor: string,
    examColor: string,
    otherColor: string,
    course: string
}

const defaultData : LecturePlanData = {
    lectureColor: "#bc0101",
    examColor: "#e8ba02",
    otherColor: "#cac6c6",
    course: "",
}

const LecturePlan = ({title, data, id, isPreview} : WidgetProps) => {

    const LOCAL_STORAGE_KEY = "lecture-plan-settings"

    const [inFullscreen, setInFullscreen] = useState(false);
    const [inSettings, setInSettings] = useState(false);
    const [weekOffset, setWeekOffset] = useState(0);
    const [lectures, setLectures] = useState<Lecture[]>([]);

    const [decodedData, setDecodedData] = useState<LecturePlanData>(() => {
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
    const [selectedCourse, setSelectedCourse] = useState(decodedData.course);
    const [selectedLectureColor, setSelectedLectureColor] = useState<string>(decodedData.lectureColor);
    const [selectedExamColor, setSelectedExamColor] = useState<string>(decodedData.examColor);
    const [selectedOtherColor, setSelectedOtherColor] = useState<string>(decodedData.otherColor);

    useEffect(() => {
        if (selectedCourse === "") {
            return;
        }
        (async () => {
            const data = await lectureService.getLecturesForWeek(weekOffset, decodedData.course);
            setLectures(data);
        })();
    }, [decodedData.course, selectedCourse, weekOffset]);

    const updateData = (partial: Partial<LecturePlanData>) => {
        setDecodedData(prev => ({ ...prev, ...partial }));
    };

    function onCourseChangeed(course: string) {
        updateData({course: course});
        setSelectedCourse(course);
    }

    async function onLinkChnaged(link: string) {
        const course = await lectureService.getCourseOrExtract(link);
        updateData({course: course});
        setSelectedCourse(course);
    }

    function saveSettings() {
        setDecodedData(prev => {
            const updated = {
                ...prev,
                lectureColor: selectedLectureColor,
                examColor: selectedExamColor,
                otherColor: selectedOtherColor,
            };

            console.log(selectedOtherColor);

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

    function onColorValueChange(color: string, key: string) {
        switch (key) {
            case "LECTURE": setSelectedLectureColor(color);
                break;
            case "EXAM": setSelectedExamColor(color);
                break;
            case "OTHER": setSelectedOtherColor(color);
                break;
        }
    }

    if (isPreview) {
        return <>
            <div className="lecture-plan-widget-preview">
                <div className="lecture-plan-preview-row">
                    <div className="lecture-plan-preview-column-small"></div>
                    <div className="lecture-plan-preview-column-large"></div>
                </div>
                <div className="lecture-plan-preview-row">
                    <div className="lecture-plan-preview-column-large"></div>
                    <div className="lecture-plan-preview-column-small"></div>
                </div>
                <div className="lecture-plan-preview-row">
                    <div className="lecture-plan-preview-column-small"></div>
                    <div className="lecture-plan-preview-column-large"></div>
                </div>
            </div>
            <h3 className="widget-title-preview">{title}</h3>
        </>

    }

    const getWidgetContent = () => (
        <div className={`lecture-plan-widget ${inFullscreen ? "fullscreen" : ""}`}>
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
                            <p className="widget-settings-heading">Vorlesungsplan ändern</p>
                            <CourseSelection selectedCourse={selectedCourse} onCourseChanged={onCourseChangeed} onLinkChanged={onLinkChnaged} />
                            <p className="widget-settings-heading">Farben</p>
                            <ColorPicker startValue={decodedData.lectureColor} onChange={(hex) => onColorValueChange(hex, "LECTURE")} label="Vorlesung" key="LECTURE" />
                            <ColorPicker startValue={decodedData.examColor} onChange={(hex) => onColorValueChange(hex, "EXAM")} label="Prüfung" key="EXAM" />
                            <ColorPicker startValue={decodedData.otherColor} onChange={(hex) => onColorValueChange(hex, "OTHER")} label="Andere" key="OTHER" />
                            <p className="widget-settings-heading">Vorlesungen Filtern</p>

                        </div>
                        <div className="widget-settings-buttons">
                            <Button text={"Zurück"} onClick={() => setInSettings(false)} variant="secondary" type="reset" fullWidth={true} />
                            <Button text={"Speichern"} onClick={() => saveSettings()} variant="primary" type="submit" fullWidth={true} />
                        </div>
                    </div>
                    : <div className="widget-content">
                        <h3 className="lecture-plan-heading">{defaultData.course}</h3>
                        <LectureCalendar
                            key={`${weekOffset}`}
                            weekOffset={weekOffset}
                            lectures={lectures}
                            colorLecture={decodedData.lectureColor}
                            colorExam={decodedData.examColor}
                            colorOther={decodedData.otherColor}
                        />
                        <div className="lecture-plan-footer">
                            <Button text="Vorherige Woche" onClick={() => setWeekOffset(weekOffset - 1)} variant="primary" fullWidth={true} />
                            <Button text="Nächste Woche" onClick={() => setWeekOffset(weekOffset + 1)} variant="primary" fullWidth={true} />
                        </div>
                    </div>
            }
        </div>
    );

    return inFullscreen
        ? createPortal(getWidgetContent(), document.body)
        : getWidgetContent();

}

export default LecturePlan;