import { forwardRef, useState, useEffect } from "react";
import { AtSign } from "lucide-react";

interface HandleInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
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
        <div className="pointer-events-none absolute left-3 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center">
          {showAvatar && selectedAvatar ? (
            <img
              src={selectedAvatar}
              alt="Selected profile"
              className="size-8 rounded-full border-2 border-cyan-500/50 object-cover dark:border-purple-500/50"
            />
          ) : (
            <AtSign className="size-5 text-purple-750/60 dark:text-cyan-250/60" />
          )}
        </div>

        {/* Input field */}
        <input
          ref={ref}
          type="text"
          className={`w-full rounded-xl border-2 bg-purple-50/50 py-3 pl-14 pr-4 text-purple-900 placeholder-purple-750/80 transition-all focus:outline-none focus:ring-2 dark:bg-slate-900/50 dark:text-cyan-100 dark:placeholder-cyan-250/80 ${
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-cyan-500/50 focus:border-transparent focus:ring-orange-500 dark:border-purple-500/30 dark:focus:ring-amber-400"
          } ${className || ""}`}
          {...props}
        />
      </div>
    );
  }
);

HandleInput.displayName = "HandleInput";

export default HandleInput;
