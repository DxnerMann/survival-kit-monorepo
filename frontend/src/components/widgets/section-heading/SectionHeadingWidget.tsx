import "@/components/widgets/section-heading/SectionHeadingWidget.css";
import {useState} from "react";
import {Pencil} from "lucide-react";
import type {WidgetProps} from "@/models/WidgetProps.tsx";
import SectionHeading from "@/components/ui/SectionHeading.tsx";
import Button from "@/components/ui/Button.tsx";
import {dashboardService} from "@/services/dashboardService.tsx";

type HeadingData = {
    title: string;
    subtitle: string;
};

const TITLE_LIMIT = 80;
const SUBTITLE_LIMIT = 140;

const readData = (data: string): HeadingData => {
    if (!data) {
        return {title: "Überschrift", subtitle: ""};
    }
    try {
        const parsed = JSON.parse(data) as Partial<HeadingData>;
        const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
        const subtitle = typeof parsed.subtitle === "string" ? parsed.subtitle.trim() : "";
        return {
            title: (title || "Überschrift").slice(0, TITLE_LIMIT),
            subtitle: subtitle.slice(0, SUBTITLE_LIMIT),
        };
    } catch {
        return {title: "Überschrift", subtitle: ""};
    }
};

const SectionHeadingWidget = ({title, data, id, isPreview}: WidgetProps) => {
    const saved = readData(data);
    const [editing, setEditing] = useState(false);
    const [titleDraft, setTitleDraft] = useState(saved.title);
    const [subtitleDraft, setSubtitleDraft] = useState(saved.subtitle);

    if (isPreview) {
        return (
            <>
                <div className="section-heading-widget section-heading-widget--preview">
                    <SectionHeading heading="Überschrift" subheading="Untertitel" centered={false} />
                </div>
                <h3 className="widget-title-preview">{title}</h3>
            </>
        );
    }

    const openEditor = () => {
        const current = readData(dashboardService.widgetData(id, data));
        setTitleDraft(current.title);
        setSubtitleDraft(current.subtitle);
        setEditing(true);
    };

    const save = () => {
        const next: HeadingData = {
            title: titleDraft.trim().slice(0, TITLE_LIMIT) || "Überschrift",
            subtitle: subtitleDraft.trim().slice(0, SUBTITLE_LIMIT),
        };
        setEditing(false);
        void dashboardService.saveWidgetData(id, JSON.stringify(next)).catch(() => undefined);
    };

    return (
        <div className="section-heading-widget">
            {editing ? (
                <form
                    className="section-heading-widget__form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        save();
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                >
                    <input
                        value={titleDraft}
                        maxLength={TITLE_LIMIT}
                        placeholder="Titel"
                        aria-label="Titel"
                        onChange={(event) => setTitleDraft(event.target.value)}
                    />
                    <input
                        value={subtitleDraft}
                        maxLength={SUBTITLE_LIMIT}
                        placeholder="Untertitel"
                        aria-label="Untertitel"
                        onChange={(event) => setSubtitleDraft(event.target.value)}
                    />
                    <Button text="Speichern" type="submit" />
                    <Button text="Abbrechen" type="button" variant="transparent" onClick={() => setEditing(false)} />
                </form>
            ) : (
                <>
                    <SectionHeading
                        heading={saved.title}
                        subheading={saved.subtitle || undefined}
                        centered={false}
                    />
                    <button
                        type="button"
                        className="section-heading-widget__edit"
                        aria-label="Überschrift bearbeiten"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={openEditor}
                    >
                        <Pencil size={16} />
                    </button>
                </>
            )}
        </div>
    );
};

export default SectionHeadingWidget;
