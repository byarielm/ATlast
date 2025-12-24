import { ReactNode, useState } from "react";
import { Info } from "lucide-react";

interface TooltipProps {
  content: ReactNode;
  children?: ReactNode;
  className?: string;
}

export default function Tooltip({ content, children, className = "" }: TooltipProps) {
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
          <Info className="w-4 h-4 text-purple-750/70 dark:text-cyan-250/70 hover:text-purple-900 dark:hover:text-cyan-100 transition-colors" />
        )}
      </button>

      {isVisible && (
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 px-3 py-2 bg-slate-900 dark:bg-slate-800 text-white text-sm rounded-lg shadow-lg z-50 pointer-events-none"
          role="tooltip"
        >
          <div className="relative">
            {content}
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-5 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-slate-900 dark:border-t-slate-800" />
          </div>
        </div>
      )}
    </div>
  );
}
