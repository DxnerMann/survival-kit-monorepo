import "@/components/widgets/lecture-plan/LecturePlan.css";
import {dashboardService} from "@/services/dashboardService.tsx";
import type {WidgetProps} from "@/models/WidgetProps.tsx";
import {useEffect, useState} from "react";
import {CalendarPlus, Fullscreen, Settings} from "lucide-react";
import {createPortal} from "react-dom";
import {getUserRole} from "@/services/tokenService.tsx";
import {LECTURE_PLAN_STORAGE_KEY, lectureService, publishTimerPlan, setTimerCourse} from "@/services/lectureService.tsx";
import {getErrorText} from "@/services/api.tsx";
import CourseSelection from "@/components/ui/CourseSelection.tsx";
import Button from "@/components/ui/Button.tsx";
import type {Lecture} from "@/models/Lecture.tsx";
import LectureCalendar from "@/components/lecture/LectureCalendar.tsx";
import CreateEventForm from "@/components/widgets/lecture-plan/CreateEventForm.tsx";
import {CUSTOM_EVENTS_CHANGED, DEFAULT_CUSTOM_EVENT_COLOR, type CustomEvent} from "@/models/CustomEvent.tsx";
import {listCustomEvents} from "@/services/customEventService.tsx";
import ColorPicker from "@/components/ui/ColorPicker.tsx";
import SelectionDropdown from "@/components/ui/SelectionDropdown.tsx";
import WidgetStatus from "@/components/ui/WidgetStatus.tsx";

interface LecturePlanData {
    lectureColor: string,
    examColor: string,
    otherColor: string,
    customColor: string,
    course: string,
    hiddenLectures: string[],
}

const defaultData : LecturePlanData = {
    lectureColor: "#bc0101",
    examColor: "#e8ba02",
    otherColor: "#cac6c6",
    customColor: DEFAULT_CUSTOM_EVENT_COLOR,
    course: "",
    hiddenLectures: []
}

const readPlan = (raw: string): LecturePlanData => {
    const parsed = JSON.parse(raw) as Partial<LecturePlanData>;
    return {
        ...defaultData,
        ...parsed,
        lectureColor: parsed.lectureColor || defaultData.lectureColor,
        examColor: parsed.examColor || defaultData.examColor,
        otherColor: parsed.otherColor || defaultData.otherColor,
        customColor: parsed.customColor || defaultData.customColor,
        course: parsed.course ?? defaultData.course,
        hiddenLectures: Array.isArray(parsed.hiddenLectures) ? parsed.hiddenLectures : [],
    };
};

const canCreateEvents = () => {
    const role = getUserRole();
    return role === "USER" || role === "MEMELORD" || role === "ADMIN";
};

const LecturePlan = ({title, data, id, isPreview} : WidgetProps) => {

    const LOCAL_STORAGE_KEY = LECTURE_PLAN_STORAGE_KEY

    const [inFullscreen, setInFullscreen] = useState(false);
    const [inSettings, setInSettings] = useState(false);
    const [inCreate, setInCreate] = useState(false);
    const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);
    const [weekOffset, setWeekOffset] = useState(0);
    const [lectures, setLectures] = useState<Lecture[]>([]);
    const [raplaNotice, setRaplaNotice] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [planMissing, setPlanMissing] = useState(false);

    const [decodedData, setDecodedData] = useState<LecturePlanData>(() => {
        try {
            if (getUserRole() !== "GUEST") {
                if (data === "") {
                    return defaultData;
                }
                return readPlan(data);
            } else {
                const cookieData = localStorage.getItem(LOCAL_STORAGE_KEY)
                if (cookieData) {
                    return readPlan(cookieData);
                } else   {
                    return defaultData;
                }
            }
        } catch {
            throw new Error("Failed to fetch Lecture-Plan Data");
        }
    });
    const [selectedCourse, setSelectedCourse] = useState(decodedData.course);
    const [selectedLectureColor, setSelectedLectureColor] = useState<string>(decodedData.lectureColor);
    const [selectedExamColor, setSelectedExamColor] = useState<string>(decodedData.examColor);
    const [selectedOtherColor, setSelectedOtherColor] = useState<string>(decodedData.otherColor);
    const [selectedCustomColor, setSelectedCustomColor] = useState<string>(decodedData.customColor);
    const [hiddenLectures, setHiddenLectures] = useState<string[]>(decodedData.hiddenLectures);
    const [allLectures, setAllLectures] = useState<string[]>([]);
    const [selectedLectures, setSelectedLectures] = useState<string[]>(
        allLectures.filter(name => !decodedData.hiddenLectures.includes(name))
    );

    useEffect(() => {
        if (isPreview || selectedCourse === "") {
            setLoading(false);
            setError(null);
            setPlanMissing(false);
            setRaplaNotice(null);
            return;
        }
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await lectureService.getLecturesForWeek(weekOffset, decodedData.course);
                if (data.linked === false) {
                    setPlanMissing(true);
                    setLectures([]);
                    setRaplaNotice(null);
                    return;
                }
                setPlanMissing(false);
                setRaplaNotice(data.notice);
                setLectures(data.lectures.filter(lecture => {
                    const isHidden = decodedData.hiddenLectures.some(hiddenText =>
                        lecture.title.trim().includes(hiddenText.trim())
                    );
                    return !isHidden;
                }));
            } catch (err: unknown) {
                setLectures([]);
                setPlanMissing(false);
                setRaplaNotice(null);
                setError(getErrorText(err));
            } finally {
                setLoading(false);
            }
        })();
    }, [decodedData, decodedData.hiddenLectures, selectedCourse, weekOffset, isPreview]);

    useEffect(() => {
        if (decodedData.customColor) {
            localStorage.setItem("lecture-plan-custom-color", decodedData.customColor);
        }
    }, [decodedData.customColor]);

    useEffect(() => {
        if (isPreview || !canCreateEvents()) {
            return;
        }
        let cancelled = false;
        const load = () => {
            listCustomEvents()
                .then(events => {
                    if (!cancelled) {
                        setCustomEvents(events);
                    }
                })
                .catch(() => {
                    if (!cancelled) {
                        setCustomEvents([]);
                    }
                });
        };
        load();
        window.addEventListener(CUSTOM_EVENTS_CHANGED, load);
        return () => {
            cancelled = true;
            window.removeEventListener(CUSTOM_EVENTS_CHANGED, load);
        };
    }, [isPreview]);

    useEffect(() => {
        if (isPreview || decodedData.course === "") {
            return;
        }
        async function load() {
            try {
                const lectures = await lectureService.getLectureNamesForSemester(decodedData.course);
                setAllLectures(lectures);

                const initialSelected = lectures.filter(l => !hiddenLectures.includes(l));
                setSelectedLectures(initialSelected);
            } catch {
                setAllLectures([]);
            }
        }
        load();
    }, [decodedData.course, hiddenLectures, isPreview]);

    useEffect(() => {
        if (isPreview) {
            return;
        }
        publishTimerPlan(decodedData.course, decodedData.hiddenLectures ?? []);
    }, [decodedData.course, decodedData.hiddenLectures, isPreview]);

    const updateData = (partial: Partial<LecturePlanData>) => {
        setDecodedData(prev => ({ ...prev, ...partial }));
    };

    function onCourseChangeed(course: string) {
        updateData({course: course});
        setSelectedCourse(course);
        setTimerCourse(course);
    }

    async function onLinkChnaged(link: string) {
        try {
            if (new URL(link).protocol !== 'https:') {
                return false
            }
        } catch {
            return false;
        }
        const course = await lectureService.extractCourse(link);
        updateData({course: course});
        setSelectedCourse(course);
        setTimerCourse(course);
    }

    function onFilterChanged(newHiddenLectures: string[]) {
        updateData({ hiddenLectures: newHiddenLectures });
        setHiddenLectures(newHiddenLectures);
        lectureService.setHiddenLectures(newHiddenLectures);
        const newSelected = allLectures.filter(
            lecture => !newHiddenLectures.includes(lecture)
        );

        setSelectedLectures(newSelected);
    }

    function saveSettings() {
        setDecodedData(prev => {
            const updated = {
                ...prev,
                lectureColor: selectedLectureColor,
                examColor: selectedExamColor,
                otherColor: selectedOtherColor,
                customColor: selectedCustomColor,
                hiddenLectures: hiddenLectures
            };
            lectureService.setHiddenLectures(hiddenLectures);

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
            case "CUSTOM": setSelectedCustomColor(color);
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
                {!inSettings && !inCreate && canCreateEvents() && (
                    <CalendarPlus
                        className="widget-header-icon"
                        size={20}
                        aria-label="Termin erstellen"
                        onClick={() => setInCreate(true)}
                    />
                )}
                {!inSettings && !inCreate && <Settings
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
                inCreate
                    ? <CreateEventForm onCancel={() => setInCreate(false)} onCreated={() => setInCreate(false)} />
                    : inSettings
                    ? <div className="settings-content">
                        <div className="settings-content-wrapper">
                            <p className="widget-settings-heading">Vorlesungsplan ändern</p>
                            <CourseSelection selectedCourse={selectedCourse} onCourseChanged={onCourseChangeed} onLinkChanged={onLinkChnaged} />
                            <p className="widget-settings-heading">Farben</p>
                            <ColorPicker startValue={decodedData.lectureColor} onChange={(hex) => onColorValueChange(hex, "LECTURE")} label="Vorlesung" key="LECTURE" />
                            <ColorPicker startValue={decodedData.examColor} onChange={(hex) => onColorValueChange(hex, "EXAM")} label="Prüfung" key="EXAM" />
                            <ColorPicker startValue={decodedData.otherColor} onChange={(hex) => onColorValueChange(hex, "OTHER")} label="Andere" key="OTHER" />
                            <ColorPicker startValue={decodedData.customColor} onChange={(hex) => onColorValueChange(hex, "CUSTOM")} label="Termin" key="CUSTOM" />
                            <p className="widget-settings-heading">Vorlesungen filtern</p>
                            < SelectionDropdown values={allLectures} selectedItems={selectedLectures} returnSelected={true} onChange={onFilterChanged} />
                        </div>
                        <div className="widget-settings-buttons">
                            <Button text={"Zurück"} onClick={() => setInSettings(false)} variant="secondary" type="reset" fullWidth={true} />
                            <Button text={"Speichern"} onClick={() => saveSettings()} variant="primary" type="submit" fullWidth={true} />
                        </div>
                    </div>
                    : <div className="widget-content">
                        {
                            decodedData.course === "" && customEvents.length === 0
                                ? <div className="no-course-set-info">
                                    Du hast noch keinen Kurs angegeben, der angezeigt werden soll.
                                    <a className="important-text" onClick={() => setInSettings(true)}>Einstellungen</a>
                                </div>
                                : loading
                                    ? <WidgetStatus status="loading" />
                                    : error && customEvents.length === 0
                                        ? <WidgetStatus status="error" message={error} />
                                        : planMissing && customEvents.length === 0
                                            ? <div className="no-course-set-info">
                                                Für diesen Kurs ist kein Stundenplan hinterlegt.
                                            </div>
                                            : <>
                                            {error && (
                                                <div className="lecture-plan-notice" role="status">
                                                    {error}
                                                </div>
                                            )}
                                            {raplaNotice && (
                                                <div className="lecture-plan-notice" role="status">
                                                    {raplaNotice}
                                                </div>
                                            )}
                                            {decodedData.course !== "" && <h4 className="lecture-plan-heading">{decodedData.course}</h4>}
                                            <LectureCalendar
                                                key={`${weekOffset}`}
                                                weekOffset={weekOffset}
                                                lectures={error || planMissing || decodedData.course === "" ? [] : lectures}
                                                colorLecture={decodedData.lectureColor}
                                                colorExam={decodedData.examColor}
                                                colorOther={decodedData.otherColor}
                                                colorCustom={decodedData.customColor}
                                                customEvents={customEvents}
                                            />
                                            <div className="lecture-plan-footer">
                                                <Button text="Vorherige Woche" onClick={() => setWeekOffset(weekOffset - 1)} variant="transparent" fullWidth={true} />
                                                <Button text="Nächste Woche" onClick={() => setWeekOffset(weekOffset + 1)} variant="transparent" fullWidth={true} />
                                            </div>
                                        </>
                        }
                    </div>
            }
        </div>
    );

    return inFullscreen
        ? createPortal(getWidgetContent(), document.body)
        : getWidgetContent();

}

export default LecturePlan;