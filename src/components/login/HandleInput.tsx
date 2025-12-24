import { forwardRef, useState, useEffect } from "react";
import { AtSign } from "lucide-react";

interface HandleInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  error?: boolean;
  selectedAvatar?: string | null;
}

const HandleInput = forwardRef<HTMLInputElement, HandleInputProps>(
  ({ error, selectedAvatar, className, ...props }, ref) => {
    const [showAvatar, setShowAvatar] = useState(false);

    useEffect(() => {
      // Show avatar when one is selected
      if (selectedAvatar) {
        setShowAvatar(true);
      } else {
        setShowAvatar(false);
      }
    }, [selectedAvatar]);

    return (
      <div className="relative">
        {/* @ symbol or Profile pic */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 pointer-events-none z-10">
          {showAvatar && selectedAvatar ? (
            <img
              src={selectedAvatar}
              alt="Selected profile"
              className="w-8 h-8 rounded-full object-cover border-2 border-cyan-500/50 dark:border-purple-500/50"
            />
          ) : (
            <AtSign className="w-5 h-5 text-purple-750/60 dark:text-cyan-250/60" />
          )}
        </div>

        {/* Input field */}
        <input
          ref={ref}
          type="text"
          className={`w-full pl-14 pr-4 py-3 bg-purple-50/50 dark:bg-slate-900/50 border-2 rounded-xl text-purple-900 dark:text-cyan-100 placeholder-purple-750/80 dark:placeholder-cyan-250/80 focus:outline-none focus:ring-2 transition-all ${
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-cyan-500/50 dark:border-purple-500/30 focus:ring-orange-500 dark:focus:ring-amber-400 focus:border-transparent"
          } ${className || ""}`}
          {...props}
        />
      </div>
    );
  }
);

HandleInput.displayName = "HandleInput";

export default HandleInput;
