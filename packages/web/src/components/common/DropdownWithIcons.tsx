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
        className={`px-3 py-2 bg-white dark:bg-slate-800 border border-cyan-500/30 dark:border-purple-500/30 rounded-lg text-sm text-purple-950 dark:text-cyan-50 hover:border-cyan-400 dark:hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-amber-400 transition-colors ${className}`}
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
        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-cyan-500/30 dark:border-purple-500/30 rounded-lg text-sm text-purple-950 dark:text-cyan-50 hover:border-cyan-400 dark:hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-amber-400 transition-colors flex items-center justify-between"
      >
        <span className="flex items-center gap-2">
          {selectedOption?.icon && (
            <img
              src={selectedOption.icon}
              alt=""
              className="w-4 h-4 flex-shrink-0"
            />
          )}
          <span>{selectedOption?.label || placeholder}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-cyan-500/30 dark:border-purple-500/30 rounded-lg shadow-lg max-h-60 overflow-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-purple-100/50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-2 relative"
            >
              {option.icon && (
                <img src={option.icon} alt="" className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="flex-1 text-purple-950 dark:text-cyan-50">
                {option.label}
              </span>
              {option.value === value && (
                <Check className="w-4 h-4 text-orange-500 dark:text-amber-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownWithIcons;
