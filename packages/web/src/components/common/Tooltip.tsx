import { ReactNode, useState } from "react";
import { Info } from "lucide-react";

interface TooltipProps {
  content: ReactNode;
  children?: ReactNode;
  className?: string;
}

export default function Tooltip({
  content,
  children,
  className = "",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className={`inline-flex items-center ${className}`}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        aria-label="More information"
      >
        {children || (
          <Info className="size-4 text-purple-750/70 transition-colors hover:text-purple-900 dark:text-cyan-250/70 dark:hover:text-cyan-100" />
        )}
      </button>

      {isVisible && (
        <div
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white shadow-lg dark:bg-slate-800"
          role="tooltip"
        >
          <div className="relative">
            {content}
            {/* Arrow */}
            <div className="absolute -bottom-5 left-1/2 size-0 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-slate-900 dark:border-t-slate-800" />
          </div>
        </div>
      )}
    </div>
  );
}
