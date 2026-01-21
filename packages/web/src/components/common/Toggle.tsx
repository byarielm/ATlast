import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  description?: string;
  id?: string;
}

const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  id,
}) => {
  const toggleId = id || `toggle-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="mb-1 font-medium text-purple-950 dark:text-cyan-50">
          {label}
        </div>
        {description && (
          <p className="text-sm text-purple-900 dark:text-cyan-100">
            {description}
          </p>
        )}
      </div>
      <label className="relative ml-4 inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          id={toggleId}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="peer sr-only"
        />
        <div className="peer h-6 w-11 rounded-full bg-gray-400 after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-orange-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-650/50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 dark:border-gray-700 dark:bg-gray-600 dark:peer-checked:bg-orange-400 dark:peer-focus:ring-amber-400/50"></div>
      </label>
    </div>
  );
};

export default Toggle;
