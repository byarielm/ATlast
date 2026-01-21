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
    <div className="relative z-50 border-b-2 border-cyan-500/30 bg-white backdrop-blur-xl dark:border-purple-500/30 dark:bg-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-1">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate(session ? "home" : "login")}
            className="flex items-center space-x-3 rounded-lg px-2 py-1 transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-amber-400"
          >
            <FireflyLogo className="h-10 w-14" />
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
                  className="flex items-center space-x-3 rounded-lg px-3 py-1 transition-colors hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:hover:bg-slate-800 dark:focus:ring-amber-400"
                >
                  <AvatarWithFallback
                    avatar={session?.avatar}
                    handle={session?.handle || ""}
                    size="sm"
                  />
                  <span className="hidden text-sm font-medium text-purple-950 dark:text-cyan-50 sm:inline">
                    @{session?.handle}
                  </span>
                  <ChevronDown
                    className={`size-4 text-purple-750 transition-transform dark:text-cyan-250 ${showMenu ? "rotate-180" : ""}`}
                  />
                </button>

                {showMenu &&
                  createPortal(
                    <div
                      ref={menuRef}
                      className="fixed z-[9999] w-64 rounded-lg border-2 border-cyan-500/30 bg-white py-2 shadow-2xl dark:border-purple-500/30 dark:bg-slate-900"
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
                        className="flex w-full items-center space-x-3 px-4 py-2 text-left transition-colors hover:bg-purple-50 dark:hover:bg-slate-800"
                      >
                        <Home className="size-4 text-purple-950 dark:text-cyan-50" />
                        <span className="text-purple-950 dark:text-cyan-50">
                          Dashboard
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onNavigate("login");
                        }}
                        className="flex w-full items-center space-x-3 px-4 py-2 text-left transition-colors hover:bg-purple-50 dark:hover:bg-slate-800"
                      >
                        <Heart className="size-4 text-purple-950 dark:text-cyan-50" />
                        <span className="text-purple-950 dark:text-cyan-50">
                          Login screen
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onLogout();
                        }}
                        className="flex w-full items-center space-x-3 px-4 py-2 text-left text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <LogOut className="size-4" />
                        <span>Log out</span>
                      </button>
                    </div>,
                    document.body
                  )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
