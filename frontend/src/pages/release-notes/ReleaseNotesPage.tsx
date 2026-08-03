import {useState} from "react";
import {ChevronDown} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading.tsx";
import {releaseNotes} from "@/data/release-notes/index.ts";
import "@/pages/release-notes/ReleaseNotesPage.css";

const formatDate = (iso: string): string => {
    const date = new Date(iso);
    return date.toLocaleDateString("de-DE", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
};

const ReleaseNotesPage = () => {
    const [openVersion, setOpenVersion] = useState(releaseNotes[0]?.version ?? "");

    return (
        <div className="survival-kit-page">
            <div className="release-notes-page">
                <SectionHeading
                    heading="Release Notes"
                    subheading="Was sich im Lecture Survival Kit geändert hat."
                    centered={false}
                />

                <div className="release-notes-accordion">
                    {releaseNotes.map((note, index) => {
                        const isOpen = openVersion === note.version;
                        const isLatest = index === 0;
                        return (
                            <div
                                key={note.version}
                                className={`release-notes-item ${isOpen ? "open" : ""} ${isLatest ? "latest" : ""}`}
                            >
                                <button
                                    type="button"
                                    className="release-notes-item__header"
                                    onClick={() =>
                                        setOpenVersion(isOpen ? "" : note.version)
                                    }
                                    aria-expanded={isOpen}
                                >
                                    <span className="release-notes-item__title">
                                        v{note.version}
                                        <span className="release-notes-item__date">
                                            {formatDate(note.date)}
                                        </span>
                                    </span>
                                    <ChevronDown
                                        className="release-notes-item__chevron"
                                        size={20}
                                        aria-hidden="true"
                                    />
                                </button>
                                {isOpen && (
                                    <div className="release-notes-item__body">
                                        {note.sections.map((section) => (
                                            <div
                                                key={section.title}
                                                className="release-notes-section"
                                            >
                                                <h3 className="release-notes-section__title">
                                                    {section.title}
                                                </h3>
                                                <ul className="release-notes-section__list">
                                                    {section.items.map((item) => (
                                                        <li key={item}>{item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ReleaseNotesPage;
