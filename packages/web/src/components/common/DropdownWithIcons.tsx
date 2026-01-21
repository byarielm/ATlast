import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface DropdownOptionWithIcon {
  value: string;
  label: string;
  icon?: string; // URL to icon (e.g., favicon.ico)
}

interface DropdownWithIconsProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOptionWithIcon[];
  className?: string;
  placeholder?: string;
}

/**
 * Custom dropdown component with icon support.
 * Shows icons next to option text similar to history card social links.
 * Falls back to native select if no icons provided.
 */
const DropdownWithIcons: React.FC<DropdownWithIconsProps> = ({
  value,
  onChange,
  options,
  className = "",
  placeholder = "Select...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasIcons = options.some((opt) => opt.icon);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  // If no icons, use native select for better accessibility
  if (!hasIcons) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-lg border border-cyan-500/30 bg-white px-3 py-2 text-sm text-purple-950 transition-colors hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-purple-500/30 dark:bg-slate-800 dark:text-cyan-50 dark:hover:border-purple-400 dark:focus:ring-amber-400 ${className}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  // Custom dropdown with icons
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg border border-cyan-500/30 bg-white px-3 py-2 text-sm text-purple-950 transition-colors hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-purple-500/30 dark:bg-slate-800 dark:text-cyan-50 dark:hover:border-purple-400 dark:focus:ring-amber-400"
      >
        <span className="flex items-center gap-2">
          {selectedOption?.icon && (
            <img
              src={selectedOption.icon}
              alt=""
              className="size-4 flex-shrink-0"
            />
          )}
          <span>{selectedOption?.label || placeholder}</span>
        </span>
        <ChevronDown
          className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-cyan-500/30 bg-white shadow-lg dark:border-purple-500/30 dark:bg-slate-800">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className="relative flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-purple-100/50 dark:hover:bg-slate-700/50"
            >
              {option.icon && (
                <img
                  src={option.icon}
                  alt=""
                  className="size-4 flex-shrink-0"
                />
              )}
              <span className="flex-1 text-purple-950 dark:text-cyan-50">
                {option.label}
              </span>
              {option.value === value && (
                <Check className="size-4 text-orange-500 dark:text-amber-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownWithIcons;
