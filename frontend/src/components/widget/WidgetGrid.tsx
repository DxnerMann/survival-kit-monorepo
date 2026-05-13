import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

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
    { minW: number; minH: number; defaultW: number; defaultH: number }
> = {
    LECTURE_PLAN: { minW: 3, minH: 4, defaultW: 5, defaultH: 4 },
    LECTURE_TIMER: { minW: 3, minH: 4, defaultW: 5, defaultH: 4  },
    CLOCK: { minW: 2, minH : 1, defaultW: 2, defaultH: 2},
    EMPTY: { minW: 2, minH: 2, defaultW: 2, defaultH: 2  }
};

function getWidgetConstraints(type: string) {
    return widgetConstraints[type] ?? widgetConstraints.default;
}

export default function WidgetGrid() {
    const ref = useRef<HTMLDivElement | null>(null);

    const [width, setWidth] = useState(1200);
    const [layout, setLayout] = useState<Layout>([]);
    const [layoutWidgets, setLayoutWidgets] = useState<UserWidget[]>([]);
    const [toolboxPool, setToolboxPool] = useState<UserWidget[]>([]);
    const [editMode, setEditMode] = useState(false);
    const [widgetDraged, setWidgetDraged] = useState<string>("");
    const isDeleteHoveredRef = useRef(false);
    const layoutRef = useRef(layout);
    const isDeletingRef = useRef(false);

    const toolbox = useMemo(() => {
        const layoutTypes = new Set(
            layout.map(l => layoutWidgets.find(w => w.id === l.i)?.type
                ?? toolboxPool.find(w => w.id === l.i)?.type)
        );
        const seen = new Set<string>();
        return toolboxPool.filter(w => {
            if (layoutTypes.has(w.type) || seen.has(w.type)) return false;
            seen.add(w.type);
            return true;
        });
    }, [toolboxPool, layout, layoutWidgets]);

    const findWidget = useCallback((id: string): UserWidget | undefined => {
        return layoutWidgets.find(w => w.id === id)
            ?? toolboxPool.find(w => w.id === id);
    }, [layoutWidgets, toolboxPool]);

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
            const isGuest = getUserRole() === 'GUEST';
            const defaultLayout = dashboardService.getDefaultLayout();
            const defaultToolbox = dashboardService.getDefaultToolbox();

            if (isGuest) {
                setLayoutWidgets(defaultLayout);
                setToolboxPool(defaultToolbox);
                setLayout(toGridLayout(defaultLayout));
                return;
            }

            const storedData: UserWidget[] | null = await dashboardService.getDashboardLayout();

            if (storedData === null) {
                setLayoutWidgets(defaultLayout);
                setToolboxPool(defaultToolbox);
                setLayout(toGridLayout(defaultLayout));
            } else {
                const storedTypes = new Set(storedData.map(w => w.type));

                const seen = new Set<string>();
                const pool = [...defaultToolbox, ...defaultLayout].filter(w => {
                    if (storedTypes.has(w.type) || seen.has(w.type)) return false;
                    seen.add(w.type);
                    return true;
                });

                setLayoutWidgets(storedData);
                setToolboxPool(pool);
                setLayout(toGridLayout(storedData));
            }
        };

        load();
    }, []);

    useEffect(() => {
        layoutRef.current = layout;
    }, [layout]);

    const handleSave = async () => {
        const updated: UserWidget[] = layout.map((l) => {
            const original = findWidget(l.i);

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

    const handleDelete = useCallback((id: string) => {
        if (isDeleteHoveredRef.current) {
            isDeletingRef.current = true;
            setLayout(prev => prev.filter(l => l.i !== id));
            setLayoutWidgets(prev => {
                const deleted = prev.find(w => w.id === id);
                if (deleted) {
                    setToolboxPool(pool => [...pool, deleted]);
                }
                return prev.filter(w => w.id !== id);
            });
        }
        setWidgetDraged("");
        isDeleteHoveredRef.current = false;
    }, []);

    return (
        <div ref={ref} className="widget-grid-wrapper">
            <GridLayout
                key={JSON.stringify(layout)}
                className="widget-grid"
                layout={layout}
                resizeConfig={{enabled: editMode}}
                dragConfig={{enabled: editMode}}
                width={width}
                autoSize
                gridConfig={{ cols: 10, rowHeight: width / 10, maxRows: 20 }}
                onLayoutChange={(l) => {
                    if (isDeletingRef.current) {
                        isDeletingRef.current = false;
                        return;
                    }
                    setLayout([...l]);
                }}
                onDragStart={(_layout, widget) => setWidgetDraged(widget?.i ?? "")}
                onDragStop={(_layout, widget) => handleDelete(widget?.i ?? "")}
            >
                {layout.map((l) => {
                    const widget = findWidget(l.i);

                    return (
                        <div
                            key={l.i}
                            className={`widget-card ${editMode ? 'edit' : 'locked'}`}
                        >
                            {dashboardService.decideOnWidget({
                                id: widget?.id ?? "",
                                data: widget?.data ?? "",
                                width: widget?.width ?? 0,
                                height: widget?.height ?? 0,
                                x: widget?.x ?? 0,
                                y: widget?.y ?? 0,
                                type: widget?.type ?? "EMPTY",
                            }, false)}
                        </div>
                    );
                })}
            </GridLayout>

            {getUserRole() !== "GUEST" && <button
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
            </button>}

            <div className={`bottom-bar ${editMode ? 'visible' : ''}`}>
                {widgetDraged !== "" && <div
                    className="delete-container"
                    onMouseEnter={() => { isDeleteHoveredRef.current = true; }}
                    onMouseLeave={() => { isDeleteHoveredRef.current = false; }}
                >
                    <h2>Entfernen</h2>
                </div>}

                <div className="toolbox-scroll">
                    {toolbox.map(widget => (
                        <div
                            key={widget.id}
                            className="toolbox-item"
                            onClick={() => {
                                const constraints = getWidgetConstraints(widget.type);
                                setLayout(prev => [...prev, {
                                    i: widget.id,
                                    x: 0,
                                    y: Infinity,
                                    w: constraints.defaultW,
                                    h: constraints.defaultH,
                                    minW: constraints.minW,
                                    minH: constraints.minH,
                                }]);
                                setToolboxPool(prev => prev.filter(w => w.id !== widget.id));
                                setLayoutWidgets(prev => [...prev, widget]);
                            }}
                        >
                            {dashboardService.decideOnWidget({
                                id: widget.id,
                                data: widget.data,
                                width: widget.width,
                                height: widget.height,
                                x: widget.x,
                                y: widget.y,
                                type: widget.type,
                            }, true)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function toGridLayout(widgets: UserWidget[]): Layout {
    return widgets.map((widget) => {
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
}