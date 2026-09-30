import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import "@/components/ui/SelectionDropdown.css";

type SelectionDropdownProps = {
    values: string[];
    selectedItems: string[];
    returnSelected: boolean;
    onChange: (items: string[]) => void;
    placeholder?: string;
};

export default function SelectionDropdown({
                                              values,
                                              selectedItems,
                                              returnSelected,
                                              onChange,
                                              placeholder = "Select items"
                                          }: SelectionDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState<string[]>(selectedItems);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const prevIsOpen = useRef(isOpen);
    const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelected(selectedItems);
    }, [selectedItems]);

    useEffect(() => {
        if (prevIsOpen.current === true && isOpen === false) {
            if (returnSelected) {
                onChange(values.filter(item => !selected.includes(item)));
            } else {
                onChange(selected);
            }
        }
        prevIsOpen.current = isOpen;
    }, [isOpen, selected, values, returnSelected, onChange]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (dropdownRef.current?.contains(target) || menuRef.current?.contains(target)) {
                return;
            }
            setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const placeMenu = () => {
            const rect = dropdownRef.current?.getBoundingClientRect();
            if (!rect) {
                return;
            }
            const spaceBelow = window.innerHeight - rect.bottom;
            const openUpward = spaceBelow < 220 && rect.top > spaceBelow;
            setMenuStyle({
                position: "fixed",
                top: openUpward ? "auto" : rect.bottom + 8,
                bottom: openUpward ? window.innerHeight - rect.top + 8 : "auto",
                left: rect.left,
                width: rect.width,
                zIndex: 100000,
            });
        };

        placeMenu();
        window.addEventListener("resize", placeMenu);
        window.addEventListener("scroll", placeMenu, true);
        return () => {
            window.removeEventListener("resize", placeMenu);
            window.removeEventListener("scroll", placeMenu, true);
        };
    }, [isOpen]);

    const handleToggle = (value: string) => {
        setSelected(prev =>
            prev.includes(value)
                ? prev.filter(item => item !== value)
                : [...prev, value]
        );
    };

    return (
        <div className="selection-dropdown" ref={dropdownRef}>
            <button
                type="button"
                className="selection-dropdown-trigger"
                onClick={() => setIsOpen(prev => !prev)}
            >
                <span className="selection-dropdown-text">
                    {selected.length > 0 ? selected.join(", ") : placeholder}
                </span>
                <span className={`selection-dropdown-arrow ${isOpen ? "open" : ""}`}>
                    ▼
                </span>
            </button>

            {isOpen && createPortal(
                <div className="selection-dropdown-menu" ref={menuRef} style={menuStyle}>
                    {values.map(value => (
                        <label key={value} className="selection-dropdown-item">
                            <input
                                type="checkbox"
                                checked={selected.includes(value)}
                                onChange={() => handleToggle(value)}
                            />
                            <span>{value}</span>
                        </label>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
}