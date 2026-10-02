import {useCallback, useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import "@/components/ui/ColorPicker.css";

interface ColorPickerProps {
    label?: string;
    startValue: string;
    onChange: (hex: string) => void;
}

interface Hsv {
    h: number;
    s: number;
    v: number;
}

const COLORS = [
    "#ff0000", "#ff4400", "#ff8800", "#ffcc00", "#ffff00",
    "#aaff00", "#00ff00", "#00ffaa", "#00ffff", "#00aaff",
    "#0055ff", "#4400ff", "#8800ff", "#cc00ff", "#ff00ff",
    "#ff0088", "#ff0044", "#ffffff", "#aaaaaa", "#555555", "#000000",
];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const hexToHsv = (hex: string): Hsv => {
    const clean = hex.replace("#", "");
    const full = clean.length === 3 ? clean.split("").map(char => char + char).join("") : clean;
    if (!/^[0-9a-fA-F]{6}$/.test(full)) {
        return {h: 0, s: 1, v: 1};
    }
    const r = parseInt(full.slice(0, 2), 16) / 255;
    const g = parseInt(full.slice(2, 4), 16) / 255;
    const b = parseInt(full.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    if (delta !== 0) {
        if (max === r) h = ((g - b) / delta) % 6;
        else if (max === g) h = (b - r) / delta + 2;
        else h = (r - g) / delta + 4;
        h *= 60;
        if (h < 0) h += 360;
    }
    return {h, s: max === 0 ? 0 : delta / max, v: max};
};

const hsvToHex = (h: number, s: number, v: number): string => {
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    let r = 0;
    let g = 0;
    let b = 0;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    const channel = (value: number) => Math.round((value + m) * 255).toString(16).padStart(2, "0");
    return `#${channel(r)}${channel(g)}${channel(b)}`;
};

const thumbPosition = (hsv: Hsv): number => {
    if (hsv.s < 0.08) {
        if (hsv.v < 0.2) return 97;
        if (hsv.v < 0.55) return 93;
        return 90;
    }
    return (hsv.h / 360) * 82;
};

const ColorPicker = ({label, startValue, onChange}: ColorPickerProps) => {
    const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(startValue));
    const [hex, setHex] = useState(startValue);
    const [open, setOpen] = useState(false);
    const [panelBox, setPanelBox] = useState<{left: number; top: number; width: number; above: boolean} | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const rowRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const fieldRef = useRef<HTMLDivElement>(null);
    const hsvRef = useRef(hsv);
    const hexRef = useRef(hex);
    hsvRef.current = hsv;
    hexRef.current = hex;

    const commit = useCallback((next: Hsv) => {
        const safe = {h: (next.h + 360) % 360, s: clamp01(next.s), v: clamp01(next.v)};
        hsvRef.current = safe;
        setHsv(safe);
        const nextHex = hsvToHex(safe.h, safe.s, safe.v);
        hexRef.current = nextHex;
        setHex(nextHex);
        onChange(nextHex);
    }, [onChange]);

    useEffect(() => {
        if (startValue.toLowerCase() === hexRef.current.toLowerCase()) return;
        const next = hexToHsv(startValue);
        hsvRef.current = next;
        hexRef.current = startValue;
        setHsv(next);
        setHex(startValue);
    }, [startValue]);

    const placePanel = useCallback(() => {
        const rect = (rowRef.current ?? rootRef.current)?.getBoundingClientRect();
        if (!rect) return;
        const width = Math.min(Math.max(rect.width, 320), 360, window.innerWidth - 16);
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
        const above = rect.top > 200;
        setPanelBox({left, top: above ? rect.top : rect.bottom, width, above});
    }, []);

    useEffect(() => {
        if (!open) return;
        placePanel();
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
            setOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        window.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("keydown", onKey);
        window.addEventListener("resize", placePanel);
        window.addEventListener("scroll", placePanel, true);
        return () => {
            window.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("resize", placePanel);
            window.removeEventListener("scroll", placePanel, true);
        };
    }, [open, placePanel]);

    const applyHue = useCallback((clientX: number) => {
        const rect = trackRef.current?.getBoundingClientRect();
        if (!rect || rect.width === 0) return;
        const pos = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        const current = hsvRef.current;
        if (pos > 88) {
            const v = pos > 96 ? 0 : pos > 92 ? 0.33 : 0.67;
            commit({...current, s: 0, v});
            return;
        }
        commit({
            h: (pos / 82) * 360,
            s: current.s < 0.08 ? 1 : current.s,
            v: current.s < 0.08 ? 1 : current.v,
        });
    }, [commit]);

    const applyField = useCallback((clientX: number, clientY: number) => {
        const rect = fieldRef.current?.getBoundingClientRect();
        if (!rect || rect.width === 0 || rect.height === 0) return;
        commit({
            h: hsvRef.current.h,
            s: clamp01((clientX - rect.left) / rect.width),
            v: clamp01(1 - (clientY - rect.top) / rect.height),
        });
    }, [commit]);

    const gradient = `linear-gradient(to right, ${COLORS.join(", ")})`;

    const panel = open && panelBox ? createPortal(
        <div
            ref={panelRef}
            className={`color-picker__panel${panelBox.above ? "" : " color-picker__panel--below"}`}
            style={{left: panelBox.left, top: panelBox.top, width: panelBox.width}}
        >
            <div className="color-picker__stage">
                <div className="color-picker__preview" style={{background: hex}} />
                <div
                    ref={fieldRef}
                    className="color-picker__field"
                    role="slider"
                    aria-label="Sättigung und Helligkeit"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(hsv.s * 100)}
                    style={{backgroundColor: `hsl(${hsv.h} 100% 50%)`}}
                    onPointerDown={(event) => {
                        applyField(event.clientX, event.clientY);
                        try {
                            event.currentTarget.setPointerCapture(event.pointerId);
                        } catch {
                            /* pointer is no longer active */
                        }
                    }}
                    onPointerMove={(event) => {
                        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                        applyField(event.clientX, event.clientY);
                    }}
                >
                    <div
                        className="color-picker__field-cursor"
                        style={{left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`}}
                    />
                </div>
            </div>
        </div>,
        document.body
    ) : null;

    return (
        <div className={`color-picker${open ? " color-picker--open" : ""}`} ref={rootRef}>
            {label && <span className="color-picker__label">{label}</span>}
            {panel}
            <div className="color-picker__row" ref={rowRef}>
                <div
                    className="color-picker__track"
                    ref={trackRef}
                    style={{background: gradient}}
                    onPointerDown={(event) => {
                        setOpen(true);
                        applyHue(event.clientX);
                        try {
                            event.currentTarget.setPointerCapture(event.pointerId);
                        } catch {
                            /* pointer is no longer active */
                        }
                    }}
                    onPointerMove={(event) => {
                        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                        applyHue(event.clientX);
                    }}
                >
                    <div
                        className="color-picker__thumb"
                        style={{left: `${thumbPosition(hsv)}%`}}
                    />
                </div>
                <button
                    type="button"
                    className="color-picker__swatch"
                    style={{background: hex}}
                    aria-label="Farbfeld öffnen"
                    aria-expanded={open}
                    onClick={() => setOpen(current => !current)}
                />
            </div>
        </div>
    );
};

export default ColorPicker;
