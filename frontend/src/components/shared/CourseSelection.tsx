import { useEffect, useRef, useState } from "react";
import { lectureService } from "../../services/lectureService.tsx";
import './CourseSelection.css';

interface CourseSelectionProps {
    selectedCourse: string;
    onCourseChanged: (course: string) => void;
    onLinkChanged: (link: string) => void;
}

const CourseSelection = ({ selectedCourse, onCourseChanged, onLinkChanged }: CourseSelectionProps) => {
    const [availableCourses, setAvailableCourses] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [raplaUrl, setRaplaUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [urlError, setUrlError] = useState("");
    const [open, setOpen] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        (async () => {
            try {
                const courses = await lectureService.getAvailableCourses();
                setAvailableCourses(courses);
            } catch {
                setAvailableCourses([]);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    useEffect(() => {
        if (open) setTimeout(() => searchRef.current?.focus(), 50);
        else {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSearch("");
            setUrlError("");
            setRaplaUrl("");
        }
    }, [open]);

    const filtered = availableCourses.filter(c =>
        c.toLowerCase().includes(search.toLowerCase())
    );

    const noResults = search.trim() !== "" && filtered.length === 0;

    const handleCourseClick = (course: string) => {
        onCourseChanged(course);
        setOpen(false);
    };

    const handleUrlSubmit = () => {
        const trimmed = raplaUrl.trim();
        if (!trimmed) { setUrlError("Bitte eine gültige Rapla-URL eingeben."); return; }
        try { new URL(trimmed); } catch { setUrlError("Die eingegebene URL ist ungültig."); return; }
        setUrlError("");
        onLinkChanged(trimmed);
        setOpen(false);
    };

    return (
        <div className="course-selection" ref={containerRef}>
            <button
                className={`course-selection__trigger${open ? " course-selection__trigger--open" : ""}`}
                onClick={() => setOpen(o => !o)}
                type="button"
            >
                <span className="course-selection__trigger-label">
                    {selectedCourse || <span className="course-selection__trigger-placeholder">Kurs auswählen…</span>}
                </span>
                <svg className="course-selection__trigger-chevron" viewBox="0 0 16 16" fill="none">
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </button>

            {open && (
                <div className="course-selection__panel">
                    <div className="course-selection__search-wrapper">
                        <svg className="course-selection__search-icon" viewBox="0 0 20 20" fill="none">
                            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
                            <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                        </svg>
                        <input
                            ref={searchRef}
                            className="course-selection__search"
                            type="text"
                            placeholder="Kurs suchen…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoComplete="off"
                        />
                        {search && (
                            <button
                                className="course-selection__clear"
                                onClick={() => { setSearch(""); searchRef.current?.focus(); }}
                                aria-label="Suche leeren"
                            >×</button>
                        )}
                    </div>

                    <div className="course-selection__list-wrapper">
                        {loading ? (
                            <div className="course-selection__state">
                                <span className="course-selection__spinner"/>
                                <span>Kurse werden geladen…</span>
                            </div>
                        ) : noResults ? (
                            <div className="course-selection__no-results">
                                <p className="course-selection__no-results-text">
                                    Kein Kurs für <strong>„{search}"</strong> gefunden.
                                </p>
                                <p className="course-selection__no-results-hint">Rapla-Link direkt eingeben (<a className="important-text" href="https://www.karlsruhe.dhbw.de/inf/studienverlauf-organisatorisches.html" target="_blank" >Vorlesungspläne</a>):</p>
                                <div className="course-selection__url-row">
                                    <input
                                        className={`course-selection__url-input${urlError ? " course-selection__url-input--error" : ""}`}
                                        type="url"
                                        placeholder="https://rapla.dhbw-karlsruhe.de/rapla?…"
                                        value={raplaUrl}
                                        onChange={e => { setRaplaUrl(e.target.value); setUrlError(""); }}
                                        onKeyDown={e => e.key === "Enter" && handleUrlSubmit()}
                                    />
                                    <button className="course-selection__url-submit" onClick={handleUrlSubmit}>
                                        Suchen
                                    </button>
                                </div>
                                {urlError && <p className="course-selection__url-error">{urlError}</p>}
                            </div>
                        ) : (
                            <ul className="course-selection__list">
                                {filtered.map(course => (
                                    <li key={course}>
                                        <button
                                            className={`course-selection__item${course === selectedCourse ? " course-selection__item--active" : ""}`}
                                            onClick={() => handleCourseClick(course)}
                                        >
                                            <span className="course-selection__item-dot"/>
                                            {course}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseSelection;