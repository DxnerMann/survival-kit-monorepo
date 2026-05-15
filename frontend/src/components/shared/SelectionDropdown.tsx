import { useEffect, useRef, useState } from "react";
import "./SelectionDropdown.css";

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
    const prevIsOpen = useRef(isOpen);

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
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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

            {isOpen && (
                <div className="selection-dropdown-menu">
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
                </div>
            )}
        </div>
    );
}