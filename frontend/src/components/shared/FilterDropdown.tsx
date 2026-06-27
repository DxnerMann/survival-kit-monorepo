import { useEffect, useRef, useState } from "react";
import { Filter, ChevronDown, X } from "lucide-react";
import "./FilterDropdown.css";

type FilterDropdownProps = {
    values: string[];
    selectedItems: string[];
    returnSelected: boolean;
    onChange: (items: string[]) => void;
    placeholder?: string;
};

export default function FilterDropdown({
                                           values,
                                           selectedItems,
                                           returnSelected,
                                           onChange,
                                           placeholder = "Filter",
                                       }: FilterDropdownProps) {
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
                onChange(values.filter((item) => !selected.includes(item)));
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
        setSelected((prev) =>
            prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
        );
    };

    const handleClear = (event: React.MouseEvent) => {
        event.stopPropagation();
        setSelected([]);
    };

    return (
        <div className="filter-dropdown" ref={dropdownRef}>
            <button
                type="button"
                className={`filter-dropdown-trigger ${selected.length > 0 ? "active" : ""}`}
                onClick={() => setIsOpen((prev) => !prev)}
            >
                <Filter size={16} className="filter-dropdown-icon" />
                <span className="filter-dropdown-text">{`${placeholder} ${selected.length > 0 ? `( ${selected.length} )` : ``}`}</span>
                {selected.length > 0 && (
                    <span
                        className="filter-dropdown-clear"
                        onClick={handleClear}
                        role="button"
                        aria-label="Filter zurücksetzen"
                    >
                        <X size={14} />
                    </span>
                )}
                <ChevronDown
                    size={16}
                    className={`filter-dropdown-arrow ${isOpen ? "open" : ""}`}
                />
            </button>

            {isOpen && (
                <div className="filter-dropdown-menu">
                    {values.map((value) => (
                        <label key={value} className="filter-dropdown-item">
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