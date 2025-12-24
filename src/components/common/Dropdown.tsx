import React from "react";

export interface DropdownOption {
  value: string;
  label: string;
  icon?: string; // URL to icon (e.g., favicon.ico)
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  className?: string;
  fullWidth?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
  value,
  onChange,
  options,
  className = "",
  fullWidth = false,
}) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 bg-white dark:bg-slate-800 border border-cyan-500/30 dark:border-purple-500/30 rounded-lg text-sm text-purple-950 dark:text-cyan-50 hover:border-cyan-400 dark:hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-amber-400 transition-colors ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default Dropdown;
