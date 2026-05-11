import { useEffect, useRef, useState } from 'react';

import GridLayout from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';

import { Pencil, Check } from 'lucide-react';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import './WidgetGrid.css';
import type {UserWidget} from "../../models/UserWidget.tsx";
import {getUserRole} from "../../services/tokenService.tsx";
import {dashboardService} from "../../services/dashboardService.tsx";

const widgetConstraints: Record<
    string,
    { minW: number; minH: number; maxW?: number; maxH?: number }
> = {
    LECTURE_PLAN: { minW: 3, minH: 4 },
    LECTURE_TIMER: { minW: 3, minH: 4 }
};

function getWidgetConstraints(type: string) {
    return widgetConstraints[type] ?? widgetConstraints.default;
}

export default function WidgetGrid() {
    const ref = useRef<HTMLDivElement | null>(null);

    const [width, setWidth] = useState(1200);
    const [layout, setLayout] = useState<Layout>([]);
    const [widgets, setWidgets] = useState<UserWidget[]>([]);
    const [editMode, setEditMode] = useState(false);
    const bottomRef = useRef<HTMLDivElement | null>(null);


    useEffect(() => {
        if (!ref.current) return;

        const observer = new ResizeObserver((entries) => {
            setWidth(entries[0].contentRect.width);
        });

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const load = async () => {
            const data =
                getUserRole() === 'GUEST'
                    ? await dashboardService.getDefaultLayout()
                    : await dashboardService.getDashboardLayout();

            setWidgets(data);

            const mapped: Layout = data.map((widget) => {
                const constraints = getWidgetConstraints(widget.type);

                return {
                    i: widget.id,
                    x: widget.x,
                    y: widget.y,
                    w: Math.max(widget.width, constraints.minW),
                    h: Math.max(widget.height, constraints.minH),
                    minW: constraints.minW,
                    minH: constraints.minH,
                };
            });

            setLayout(mapped);
        };

        load();
    }, []);

    const handleSave = async () => {
        const updated: UserWidget[] = layout.map((l) => {
            const original = widgets.find((w) => w.id === l.i);

            return {
                id: l.i,
                x: l.x,
                y: l.y,
                width: l.w,
                height: l.h,
                type: original?.type ?? "EMPTY",
                data: original?.data ?? "",
            };
        });

        await dashboardService.saveDashbordLayout(updated);
    };

    return (
        <div ref={ref} className="widget-grid-wrapper">
            <GridLayout
                className="widget-grid"
                layout={layout}
                width={width}
                autoSize
                gridConfig={{ cols: 10, rowHeight: width / 10, maxRows: 20 }}
                onLayoutChange={(l) => setLayout(l)}
                onDragStop={(_layout, _oldItem, newItem) => {
                    if (!newItem) return;

                    const bottom = bottomRef.current?.getBoundingClientRect();
                    if (!bottom) return;

                    const mouseY = window.event ? (window.event as MouseEvent).clientY : 0;

                    if (mouseY >= bottom.top) {
                        setLayout(prev => prev.filter(w => w.i !== newItem.i));
                        setWidgets(prev => prev.filter(w => w.id !== newItem.i));
                    }
                }}
            >
                {layout.map((l) => {
                    const widget = widgets.find((w) => w.id === l.i);

                    return (
                        <div
                            key={l.i}
                            className={`widget-card ${editMode ? 'edit' : 'locked'}`}
                        >
                            {widget?.type ?? 'unknown'}
                        </div>
                    );
                })}
            </GridLayout>

            <button
                className="edit-button"
                onClick={() => {
                    const next = !editMode;

                    if (!next) {
                        handleSave();
                    }

                    setEditMode(next);
                }}
            >
                {editMode
                    ? <div className="edit-button-content">
                        <Check size={20} />
                        Speichern
                    </div>
                    : <div className="edit-button-content">
                        <Pencil size={20} />
                        Layout anpassen
                    </div>
                }
            </button>

            <div
                ref={bottomRef}
                className={`bottom-bar ${editMode ? 'visible' : ''}`}
            >
                Drop here to delete
            </div>
        </div>
    );
}