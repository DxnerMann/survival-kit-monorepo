import "@/components/widgets/section-heading/SectionHeadingWidget.css";
import {useEffect, useRef, useState} from "react";
import type {WidgetProps} from "@/models/WidgetProps.tsx";
import SectionHeading from "@/components/ui/SectionHeading.tsx";
import {dashboardService} from "@/services/dashboardService.tsx";

type HeadingData = {
    title: string;
    subtitle: string;
};

const DEFAULT_TITLE = "Überschrift";
const DEFAULT_SUBTITLE = "unterüberschrift";
const TITLE_LIMIT = 80;
const SUBTITLE_LIMIT = 140;

const readData = (data: string): HeadingData => {
    if (!data) {
        return {title: DEFAULT_TITLE, subtitle: DEFAULT_SUBTITLE};
    }
    try {
        const parsed = JSON.parse(data) as Partial<HeadingData>;
        const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
        const subtitle = typeof parsed.subtitle === "string" ? parsed.subtitle.trim() : "";
        return {
            title: (title || DEFAULT_TITLE).slice(0, TITLE_LIMIT),
            subtitle: (subtitle || DEFAULT_SUBTITLE).slice(0, SUBTITLE_LIMIT),
        };
    } catch {
        return {title: DEFAULT_TITLE, subtitle: DEFAULT_SUBTITLE};
    }
};

const keepPointer = (event: {stopPropagation: () => void}) => {
    event.stopPropagation();
};

const SectionHeadingWidget = ({title, data, id, isPreview, editable = false}: WidgetProps) => {
    const saved = readData(dashboardService.widgetData(id, data));
    const [heading, setHeading] = useState(saved.title);
    const [subheading, setSubheading] = useState(saved.subtitle);
    const focused = useRef(false);

    useEffect(() => {
        if (focused.current) {
            return;
        }
        const next = readData(dashboardService.widgetData(id, data));
        setHeading(next.title);
        setSubheading(next.subtitle);
    }, [data, id]);

    if (isPreview) {
        return (
            <>
                <div className="section-heading-widget section-heading-widget--preview">
                    <SectionHeading heading={DEFAULT_TITLE} subheading={DEFAULT_SUBTITLE} centered={false} />
                </div>
                <h3 className="widget-title-preview">{title}</h3>
            </>
        );
    }

    const persist = (nextTitle: string, nextSubtitle: string) => {
        const next = {
            title: nextTitle.trim().slice(0, TITLE_LIMIT) || DEFAULT_TITLE,
            subtitle: nextSubtitle.trim().slice(0, SUBTITLE_LIMIT) || DEFAULT_SUBTITLE,
        };
        setHeading(next.title);
        setSubheading(next.subtitle);
        const payload = JSON.stringify(next);
        if (payload === dashboardService.widgetData(id, data)) {
            return;
        }
        void dashboardService.saveWidgetData(id, payload).catch(() => undefined);
    };

    if (!editable) {
        return (
            <div className="section-heading-widget">
                <SectionHeading heading={heading} subheading={subheading} centered={false} />
            </div>
        );
    }

    return (
        <div className="section-heading-widget">
            <div className="section-heading-wrapper">
                <div className="section-heading-left">
                    <h1 className="section-heading-heading">
                        <input
                            className="section-heading-widget__field"
                            value={heading}
                            maxLength={TITLE_LIMIT}
                            aria-label="Überschrift"
                            onMouseDown={keepPointer}
                            onPointerDown={keepPointer}
                            onTouchStart={keepPointer}
                            onFocus={() => {
                                focused.current = true;
                            }}
                            onChange={(event) => setHeading(event.target.value)}
                            onBlur={() => {
                                focused.current = false;
                                persist(heading, subheading);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.currentTarget.blur();
                                }
                            }}
                        />
                    </h1>
                    <h4 className="section-heading-subheading">
                        <input
                            className="section-heading-widget__field"
                            value={subheading}
                            maxLength={SUBTITLE_LIMIT}
                            aria-label="Unterüberschrift"
                            onMouseDown={keepPointer}
                            onPointerDown={keepPointer}
                            onTouchStart={keepPointer}
                            onFocus={() => {
                                focused.current = true;
                            }}
                            onChange={(event) => setSubheading(event.target.value)}
                            onBlur={() => {
                                focused.current = false;
                                persist(heading, subheading);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.currentTarget.blur();
                                }
                            }}
                        />
                    </h4>
                </div>
            </div>
        </div>
    );
};

export default SectionHeadingWidget;
