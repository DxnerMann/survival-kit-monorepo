import {Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';

import GridLayout from 'react-grid-layout';
import type { Layout, LayoutItem } from 'react-grid-layout';

import { Pencil, Trash2 } from 'lucide-react';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import "@/components/widgets/WidgetGrid.css";
import type {UserWidget} from "@/models/UserWidget.tsx";
import {getUserRole} from "@/services/tokenService.tsx";
import {dashboardService} from "@/services/dashboardService.tsx";
import {applyStoredLecturePlan, restoreGuestTimerPlan} from "@/services/lectureService.tsx";

const widgetConstraints: Record<string, { minW: number; minH: number; maxW?: number; maxH?: number; defaultW: number; defaultH: number }> = {
    LECTURE_PLAN: { minW: 3, minH: 4, defaultW: 5, defaultH: 4 },
    LECTURE_TIMER: { minW: 3, minH: 4, defaultW: 5, defaultH: 4  },
    CLOCK: { minW: 2, minH : 1, defaultW: 2, defaultH: 2},
    DIGRESSION_TIMER: {minW: 4, minH: 3, defaultW: 4, defaultH: 3},
    DAILY_CAT: {minW: 2, minH: 2, defaultW: 2, defaultH: 2},
    DAILY_MEME: {minW: 2, minH: 2, maxW: 10, maxH: 7, defaultW: 2, defaultH: 2},
    CURRENT_CAFFEINE: { minW: 2, minH: 1, maxW: 4, maxH: 2, defaultW: 2, defaultH: 1 },
    FAV_GAMES: { minW: 2, minH: 2, maxW: 10, defaultW: 2, defaultH: 2 },
    FEGEFEUER: { minW: 2, minH: 1, maxW: 5, maxH: 5, defaultW: 4, defaultH: 2 },
    COUNTER: { minW: 2, minH: 2, maxW: 6, maxH: 5, defaultW: 4, defaultH: 3 },
    LEADERBOARD: { minW: 2, minH: 3, maxW: 10, maxH: 8, defaultW: 3, defaultH: 4 },
    SECTION_HEADING: { minW: 10, maxW: 10, minH: 1, maxH: 1, defaultW: 10, defaultH: 1 },
    EMPTY: { minW: 2, minH: 2, defaultW: 2, defaultH: 2  }
};

const DROPPING_ID = "__dropping-elem__";
const GRID_COLS = 10;
const canRepeat = (type: string | undefined) => type === "SECTION_HEADING";

class WidgetBoundary extends Component<{children: ReactNode; fallback: ReactNode}, {failed: boolean}> {
    state = {failed: false};

    static getDerivedStateFromError() {
        return {failed: true};
    }

    render() {
        if (this.state.failed) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

const sameLayout = (left: Layout, right: Layout) => {
    if (left.length !== right.length) {
        return false;
    }
    return left.every((item, index) => {
        const other = right[index];
        return other !== undefined
            && item.i === other.i
            && item.x === other.x
            && item.y === other.y
            && item.w === other.w
            && item.h === other.h;
    });
};

const finite = (value: number | undefined, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;

type PendingDrop = {
    sourceId: string;
    placed: UserWidget;
    w: number;
    h: number;
};

interface WidgetGridProps {
    editMode: boolean;
    closeEditMode: () => void
}

function getWidgetConstraints(type: string) {
    return widgetConstraints[type] ?? widgetConstraints.default;
}

function isPointInside(element: HTMLElement | null, x: number, y: number) {
    if (!element) {
        return false;
    }
    const rect = element.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export default function WidgetGrid({editMode, closeEditMode} : WidgetGridProps) {
    const ref = useRef<HTMLDivElement | null>(null);
    const [width, setWidth] = useState(1200);
    const [layout, setLayout] = useState<Layout>([]);
    const [layoutWidgets, setLayoutWidgets] = useState<UserWidget[]>([]);
    const [toolboxPool, setToolboxPool] = useState<UserWidget[]>([]);
    const [widgetDraged, setWidgetDraged] = useState<string>("");
    const isDeleteHoveredRef = useRef(false);
    const layoutRef = useRef(layout);
    const layoutWidgetsRef = useRef(layoutWidgets);
    const removedIdsRef = useRef<Set<string>>(new Set());
    const hasLoaded = useRef(false);
    const droppingRef = useRef<PendingDrop | null>(null);
    const acceptedDropRef = useRef<LayoutItem | null>(null);
    const deleteZoneRef = useRef<HTMLDivElement | null>(null);
    const dragFinishedRef = useRef(false);

    const toolbox = useMemo(() => {
        const layoutTypes = new Set(
            layout.map(l => layoutWidgets.find(w => w.id === l.i)?.type
                ?? toolboxPool.find(w => w.id === l.i)?.type)
        );
        const seen = new Set<string>();
        return toolboxPool.filter(w => {
            if (seen.has(w.type)) return false;
            if (!canRepeat(w.type) && layoutTypes.has(w.type)) return false;
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
        if (hasLoaded.current) return;
        hasLoaded.current = true;

        const load = async () => {
            const isGuest = getUserRole() === 'GUEST';
            const defaultLayout = dashboardService.getDefaultLayout();
            const defaultToolbox = dashboardService.getDefaultToolbox();

            if (isGuest) {
                restoreGuestTimerPlan();
                setLayoutWidgets(defaultLayout);
                setToolboxPool(defaultToolbox);
                setLayout(toGridLayout(defaultLayout));
                return;
            }

            let storedData: UserWidget[] | null;

            try {
                storedData = await dashboardService.getDashboardLayout();
            } catch {
                storedData = defaultLayout;
            }
            storedData
                .filter(widget => widget.type === "LECTURE_PLAN")
                .forEach(widget => applyStoredLecturePlan(widget.data));
            const storedTypes = new Set(storedData.map(w => w.type));

            const seen = new Set<string>();
            const pool = [...defaultToolbox, ...defaultLayout].filter(w => {
                if (seen.has(w.type)) return false;
                if (!canRepeat(w.type) && storedTypes.has(w.type)) return false;
                seen.add(w.type);
                return true;
            });
            setLayoutWidgets(storedData);
            setToolboxPool(pool);
            setLayout(toGridLayout(storedData));
        };

        load();
    }, []);

    useEffect(() => {
        layoutRef.current = layout;
    }, [layout]);

    useEffect(() => {
        layoutWidgetsRef.current = layoutWidgets;
    }, [layoutWidgets]);

    useEffect(() => {
        if (!editMode) {
            setWidgetDraged("");
        }
    }, [editMode]);

    useEffect(() => {
        return dashboardService.subscribeWidgetData((id, data) => {
            const apply = (widgets: UserWidget[]) => {
                const index = widgets.findIndex(widget => widget.id === id);
                if (index === -1 || widgets[index].data === data) {
                    return widgets;
                }
                const next = widgets.slice();
                next[index] = {...widgets[index], data};
                return next;
            };
            setLayoutWidgets(apply);
            setToolboxPool(apply);
        });
    }, []);

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
                data: dashboardService.widgetData(l.i, original?.data ?? ""),
            };
        });
        setLayoutWidgets(updated);
        await dashboardService.saveDashbordLayout(updated);
    };

    const removeWidget = useCallback((id: string) => {
        if (!id || removedIdsRef.current.has(id)) {
            return;
        }
        const deleted = layoutWidgetsRef.current.find(widget => widget.id === id);
        const isOnGrid = layoutRef.current.some(item => item.i === id);
        if (!deleted && !isOnGrid) {
            return;
        }
        removedIdsRef.current.add(id);
        if (deleted) {
            const remaining = layoutWidgetsRef.current.filter(widget => widget.id !== id);
            layoutWidgetsRef.current = remaining;
            setLayoutWidgets(remaining);
            setToolboxPool(prev => {
                if (prev.some(widget => widget.id === deleted.id)) return prev;
                if (canRepeat(deleted.type) && prev.some(widget => widget.type === deleted.type)) return prev;
                return [...prev, deleted];
            });
        }
        setLayout(prev => prev.filter(item => item.i !== id));
    }, []);

    const clearGrid = () => {
        const placedIds = new Set(layoutRef.current.map(item => item.i));
        if (placedIds.size === 0) {
            return;
        }
        placedIds.forEach(id => removedIdsRef.current.add(id));
        const placed = layoutWidgetsRef.current.filter(widget => placedIds.has(widget.id));
        layoutWidgetsRef.current = [];
        layoutRef.current = [];
        setWidgetDraged("");
        isDeleteHoveredRef.current = false;
        setLayoutWidgets([]);
        setLayout([]);
        setToolboxPool(prev => {
            const existingIds = new Set(prev.map(widget => widget.id));
            const existingTypes = new Set(prev.map(widget => widget.type));
            return [...prev, ...placed.filter(widget => {
                if (existingIds.has(widget.id)) return false;
                return !(canRepeat(widget.type) && existingTypes.has(widget.type));
            })];
        });
    };

    useEffect(() => {
        if (widgetDraged === "") {
            return;
        }
        dragFinishedRef.current = false;
        const trackPointer = (event: PointerEvent) => {
            isDeleteHoveredRef.current = isPointInside(deleteZoneRef.current, event.clientX, event.clientY);
        };
        const endDrag = (event: PointerEvent) => {
            const shouldDelete = isPointInside(deleteZoneRef.current, event.clientX, event.clientY);
            isDeleteHoveredRef.current = shouldDelete;
            const id = widgetDraged;
            window.setTimeout(() => {
                if (dragFinishedRef.current) {
                    return;
                }
                dragFinishedRef.current = true;
                isDeleteHoveredRef.current = false;
                setWidgetDraged("");
                if (shouldDelete) {
                    removeWidget(id);
                }
            }, 0);
        };
        window.addEventListener("pointermove", trackPointer);
        window.addEventListener("pointerup", endDrag);
        window.addEventListener("pointercancel", endDrag);
        return () => {
            window.removeEventListener("pointermove", trackPointer);
            window.removeEventListener("pointerup", endDrag);
            window.removeEventListener("pointercancel", endDrag);
        };
    }, [widgetDraged, removeWidget]);

    const placeFromToolbox = (widget: UserWidget): PendingDrop => {
        const placed: UserWidget = widget.id.startsWith("default-")
            ? {...widget, id: crypto.randomUUID()}
            : widget;
        removedIdsRef.current.delete(placed.id);
        const constraints = getWidgetConstraints(placed.type);
        return {
            sourceId: widget.id,
            placed,
            w: constraints.defaultW,
            h: constraints.defaultH,
        };
    };

    const handleToolboxDrop = (_layout: Layout, item: LayoutItem | undefined) => {
        const pending = droppingRef.current;
        droppingRef.current = null;
        if (!pending || !item) {
            return;
        }
        const constraints = getWidgetConstraints(pending.placed.type);
        const maxW = Math.min(constraints.maxW ?? GRID_COLS, GRID_COLS);
        const minW = Math.min(constraints.minW, maxW);
        let w = Math.min(Math.max(constraints.defaultW, minW), maxW);
        const minH = constraints.minH;
        const maxH = constraints.maxH ?? Math.max(minH, constraints.defaultH);
        const h = Math.min(Math.max(constraints.defaultH, minH), maxH);
        let x = finite(item.x, 0);
        const y = Math.max(0, finite(item.y, 0));
        if (w >= GRID_COLS) {
            w = GRID_COLS;
            x = 0;
        } else {
            x = Math.max(0, Math.min(x, GRID_COLS - w));
        }
        const dropped: LayoutItem = {
            i: pending.placed.id,
            x,
            y,
            w,
            h,
            minW,
            minH,
            maxW: constraints.maxW,
            maxH: constraints.maxH,
        };
        acceptedDropRef.current = dropped;
        setLayout(prev => [...prev.filter(entry => entry.i !== dropped.i && entry.i !== DROPPING_ID), dropped]);
        setToolboxPool(prev => canRepeat(pending.placed.type)
            ? prev
            : prev.filter(entry => entry.id !== pending.sourceId));
        setLayoutWidgets(prev => [...prev.filter(entry => entry.id !== pending.placed.id), pending.placed]);
    };

    return (
        <div ref={ref} className="widget-grid-wrapper">
            <WidgetBoundary fallback={<p className="widget-error">Das Dashboard konnte nicht angezeigt werden. Lade die Seite neu.</p>}>
            <GridLayout
                className="widget-grid"
                layout={layout}
                resizeConfig={{enabled: editMode}}
                dragConfig={{enabled: editMode}}
                dropConfig={{
                    enabled: editMode,
                    defaultItem: {w: 2, h: 2},
                    onDragOver: () => {
                        const pending = droppingRef.current;
                        if (!pending) {
                            return false;
                        }
                        return {w: pending.w, h: pending.h};
                    },
                }}
                droppingItem={{i: DROPPING_ID, x: 0, y: 0, w: 2, h: 2}}
                width={width}
                autoSize
                gridConfig={{ cols: GRID_COLS, rowHeight: width / GRID_COLS, maxRows: 40 }}
                onDrop={handleToolboxDrop}
                onLayoutChange={(next) => {
                    const removed = removedIdsRef.current;
                    const known = new Set(layoutWidgetsRef.current.map(widget => widget.id));
                    const pendingDrop = acceptedDropRef.current;
                    if (pendingDrop) {
                        known.add(pendingDrop.i);
                    }
                    let incoming = next.filter(entry =>
                        entry.i
                        && entry.i !== DROPPING_ID
                        && !removed.has(entry.i)
                        && known.has(entry.i)
                        && Number.isFinite(entry.x)
                        && Number.isFinite(entry.y)
                        && Number.isFinite(entry.w)
                        && Number.isFinite(entry.h)
                    );
                    if (pendingDrop && (removed.has(pendingDrop.i) || incoming.some(entry => entry.i === pendingDrop.i))) {
                        acceptedDropRef.current = null;
                    } else if (pendingDrop) {
                        incoming = [...incoming, pendingDrop];
                        acceptedDropRef.current = null;
                    }
                    setLayout(prev => {
                        const kept = prev.filter(entry => entry.i && entry.i !== DROPPING_ID && !removed.has(entry.i));
                        const seen = new Set<string>();
                        const merged: LayoutItem[] = [];
                        for (const entry of incoming) {
                            if (seen.has(entry.i)) {
                                continue;
                            }
                            seen.add(entry.i);
                            merged.push(entry);
                        }
                        for (const entry of kept) {
                            if (!seen.has(entry.i)) {
                                merged.push(entry);
                            }
                        }
                        return sameLayout(prev, merged) ? prev : merged;
                    });
                }}
                onDragStart={(_layout, widget) => {
                    const id = widget?.i ?? "";
                    if (id === "" || id === DROPPING_ID) {
                        return;
                    }
                    setWidgetDraged(id);
                }}
                onDragStop={(_layout, widget, _newItem, _placeholder, event) => {
                    dragFinishedRef.current = true;
                    const id = widget?.i ?? "";
                    const pointer = event && "clientX" in event && "clientY" in event
                        ? event as MouseEvent
                        : null;
                    const releasedInDeleteZone = pointer
                        ? isPointInside(deleteZoneRef.current, pointer.clientX, pointer.clientY)
                        : false;
                    const shouldDelete = releasedInDeleteZone || isDeleteHoveredRef.current;
                    isDeleteHoveredRef.current = false;
                    setWidgetDraged("");
                    if (shouldDelete && id && id !== DROPPING_ID) {
                        removeWidget(id);
                    }
                }}
            >
                {layout.map((l) => {
                    if (!l?.i) {
                        return null;
                    }
                    const widget = findWidget(l.i);

                    return (
                        <div
                            key={l.i}
                            className={`widget-card ${editMode ? 'edit' : 'locked'}${widget?.type === "SECTION_HEADING" ? " widget-card--plain" : ""}`}
                        >
                            <WidgetBoundary fallback={<p className="widget-error">Widget konnte nicht geladen werden.</p>}>
                                <WidgetSlot
                                    id={widget?.id ?? ""}
                                    data={widget?.data ?? ""}
                                    width={l.w}
                                    height={l.h}
                                    x={widget?.x ?? 0}
                                    y={widget?.y ?? 0}
                                    type={widget?.type ?? "EMPTY"}
                                    editable={editMode}
                                />
                            </WidgetBoundary>
                        </div>
                    );
                })}
            </GridLayout>
            </WidgetBoundary>

            <div
                ref={deleteZoneRef}
                className={`bottom-bar ${editMode ? "visible" : ""} ${widgetDraged !== "" ? "is-delete-target" : ""}`}
            >
                {widgetDraged !== "" && <div
                    className="delete-container"
                >
                    <h2>Hier loslassen zum entfernen</h2>
                </div>
                }
                {editMode && <div className="edit-actions">
                    <button
                        type="button"
                        className="edit-button"
                        onClick={clearGrid}
                        disabled={layout.length === 0}
                    >
                        <div className="edit-button-content">
                            <Trash2 size={20} />
                            Alle entfernen
                        </div>
                    </button>
                    <button
                        type="button"
                        className="edit-button"
                        onClick={() => {
                            closeEditMode();
                            handleSave();
                        }}
                    >
                        <div className="edit-button-content">
                            <Pencil size={20} />
                            Speichern
                        </div>
                    </button>
                </div>}
                <p className="toolbox-hint">Ziehe das gewünschte Widget in dein Dashboard und passe die Größe an.</p>
                <div className="toolbox-scroll">
                    {toolbox.map(widget => (
                        <div
                            key={widget.id}
                            className="toolbox-item"
                            draggable={editMode}
                            onDragStart={(event) => {
                                const pending = placeFromToolbox(widget);
                                droppingRef.current = pending;
                                event.dataTransfer.setData("text/plain", pending.placed.id);
                                event.dataTransfer.effectAllowed = "copy";
                            }}
                            onDragEnd={() => {
                                const pending = droppingRef.current;
                                window.setTimeout(() => {
                                    if (droppingRef.current === pending) {
                                        droppingRef.current = null;
                                    }
                                }, 0);
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

function WidgetSlot({id, data, width, height, x, y, type, editable}: UserWidget & {editable: boolean}) {
    return dashboardService.decideOnWidget({id, data, width, height, x, y, type}, false, editable);
}

function toGridLayout(widgets: UserWidget[]): Layout {
    return widgets.map((widget) => {
        const constraints = getWidgetConstraints(widget.type);
        const w = Math.max(widget.width, constraints.minW);
        const h = Math.max(widget.height, constraints.minH);
        return {
            i: widget.id,
            x: widget.x,
            y: widget.y,
            w: constraints.maxW != null ? Math.min(w, constraints.maxW) : w,
            h: constraints.maxH != null ? Math.min(h, constraints.maxH) : h,
            minW: constraints.minW,
            minH: constraints.minH,
            maxW: constraints.maxW,
            maxH: constraints.maxH,
        };
    });
}