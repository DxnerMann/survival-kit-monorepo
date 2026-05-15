import { useCallback, useEffect, useRef, useState } from "react";
import "./ColorPicker.css";

interface ColorPickerProps {
    label?: string;
    startValue: string;
    onChange: (hex: string) => void;
}

const COLORS = [
    "#ff0000", "#ff4400", "#ff8800", "#ffcc00", "#ffff00",
    "#aaff00", "#00ff00", "#00ffaa", "#00ffff", "#00aaff",
    "#0055ff", "#4400ff", "#8800ff", "#cc00ff", "#ff00ff",
    "#ff0088", "#ff0044", "#ffffff", "#aaaaaa", "#555555", "#000000",
];

const hexToHsl = (hex: string): [number, number, number] => {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, Math.round(l * 100)];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    // eslint-disable-next-line no-useless-assignment
    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
};

const hslToHex = (h: number, s: number, l: number): string => {
    const sl = s / 100, ll = l / 100;
    const a = sl * Math.min(ll, 1 - ll);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
};

const hexToPosition = (hex: string): number => {
    try {
        const [h, s, l] = hexToHsl(hex);
        if (s < 10) return l < 20 ? 95 : l > 80 ? 90 : 92;
        return (h / 360) * 82;
    } catch {
        return 0;
    }
};

const positionToHex = (pos: number): string => {
    if (pos > 88) {
        const gray = pos > 96 ? 0 : pos > 92 ? 170 : 220;
        return `#${gray.toString(16).padStart(2, "0").repeat(3)}`;
    }
    const h = (pos / 82) * 360;
    return hslToHex(h, 100, 50);
};

const ColorPicker = ({ label, startValue, onChange }: ColorPickerProps) => {
    const [position, setPosition] = useState(() => hexToPosition(startValue));
    const [hex, setHex] = useState(startValue);
    const trackRef = useRef<HTMLDivElement>(null);
    const dragging = useRef(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPosition(hexToPosition(startValue));
        setHex(startValue);
    }, [startValue]);

    const updateFromPosition = useCallback((pos: number) => {
        const clamped = Math.max(0, Math.min(100, pos));
        setPosition(clamped);
        const newHex = positionToHex(clamped);
        setHex(newHex);
        onChange(newHex);
    }, [onChange]);

    const posFromEvent = useCallback((clientX: number): number => {
        const rect = trackRef.current?.getBoundingClientRect();
        if (!rect) return 0;
        return ((clientX - rect.left) / rect.width) * 100;
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        dragging.current = true;
        updateFromPosition(posFromEvent(e.clientX));
    };

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (dragging.current) updateFromPosition(posFromEvent(e.clientX));
        };
        const onUp = () => { dragging.current = false; };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, [posFromEvent, updateFromPosition]);

    const gradient = `linear-gradient(to right, ${COLORS.join(", ")})`;

    return (
        <div className="color-picker">
            {label && <span className="color-picker__label">{label}</span>}

            <div className="color-picker__row">
                <div
                    className="color-picker__track"
                    ref={trackRef}
                    style={{ background: gradient }}
                    onMouseDown={handleMouseDown}
                >
                    <div
                        className="color-picker__thumb"
                        style={{ left: `${position}%` }}
                    />
                </div>

                <div
                    className="color-picker__swatch"
                    style={{ background: hex }}
                />
            </div>
        </div>
    );
};

export default ColorPicker;