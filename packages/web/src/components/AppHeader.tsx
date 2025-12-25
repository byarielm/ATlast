import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Heart, Home, LogOut, ChevronDown } from "lucide-react";
import ThemeControls from "./ThemeControls";
import FireflyLogo from "../assets/at-firefly-logo.svg?react";
import AvatarWithFallback from "./common/AvatarWithFallback";

interface atprotoSession {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
}

interface AppHeaderProps {
  session: atprotoSession | null;
  onLogout: () => void;
  onNavigate: (step: "home" | "login") => void;
  currentStep: string;
  isDark?: boolean;
  reducedMotion?: boolean;
  onToggleTheme?: () => void;
  onToggleMotion?: () => void;
}

export default function AppHeader({
  session,
  onLogout,
  onNavigate,
  currentStep,
  isDark = false,
  reducedMotion = false,
  onToggleTheme,
  onToggleMotion,
}: AppHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showMenu]);

  return (
    <div className="bg-white dark:bg-slate-900 border-b-2 border-cyan-500/30 dark:border-purple-500/30 backdrop-blur-xl relative z-50">
      <div className="max-w-6xl mx-auto px-4 py-1">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate(session ? "home" : "login")}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-amber-400 rounded-lg px-2 py-1"
          >
            <FireflyLogo className="w-14 h-10" />
            <h1 className="font-display text-2xl font-bold text-purple-950 dark:text-cyan-50">
              ATlast
            </h1>
          </button>

          <div className="flex items-center space-x-4">
            {onToggleTheme && onToggleMotion && (
              <ThemeControls
                isDark={isDark}
                reducedMotion={reducedMotion}
                onToggleTheme={onToggleTheme}
                onToggleMotion={onToggleMotion}
              />
            )}
            {session && (
              <>
                <button
                  ref={buttonRef}
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center space-x-3 px-3 py-1 rounded-lg hover:bg-purple-50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-amber-400"
                >
                  <AvatarWithFallback
                    avatar={session?.avatar}
                    handle={session?.handle || ""}
                    size="sm"
                  />
                  <span className="text-sm font-medium text-purple-950 dark:text-cyan-50 hidden sm:inline">
                    @{session?.handle}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-purple-750 dark:text-cyan-250 transition-transform ${showMenu ? "rotate-180" : ""}`}
                  />
                </button>

                {showMenu &&
                  createPortal(
                    <div
                      ref={menuRef}
                      className="fixed w-64 bg-white dark:bg-slate-900 rounded-lg shadow-2xl border-2 border-cyan-500/30 dark:border-purple-500/30 py-2 z-[9999]"
                      style={{
                        top: `${menuPosition.top}px`,
                        right: `${menuPosition.right}px`,
                      }}
                    >
                      <div className="px-4 py-3">
                        <div className="font-semibold text-purple-950 dark:text-cyan-50">
                          {session?.displayName || session.handle}
                        </div>
                        <div className="text-sm text-purple-750 dark:text-cyan-250">
                          @{session?.handle}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onNavigate("home");
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-purple-50 dark:hover:bg-slate-800 transition-colors text-left"
                      >
                        <Home className="w-4 h-4 text-purple-950 dark:text-cyan-50" />
                        <span className="text-purple-950 dark:text-cyan-50">
                          Dashboard
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onNavigate("login");
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-purple-50 dark:hover:bg-slate-800 transition-colors text-left"
                      >
                        <Heart className="w-4 h-4 text-purple-950 dark:text-cyan-50" />
                        <span className="text-purple-950 dark:text-cyan-50">
                          Login screen
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onLogout();
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left text-red-600 dark:text-red-400"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log out</span>
                      </button>
                    </div>,
                    document.body,
                  )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
