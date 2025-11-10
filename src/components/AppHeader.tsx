import { useState, useEffect, useRef } from "react";
import { Heart, Home, LogOut, ChevronDown } from "lucide-react";
import ThemeControls from "./ThemeControls";

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
  onNavigate: (step: 'home' | 'login') => void;
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
  onToggleMotion
}: AppHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white/95 dark:bg-slate-800/95 border-b-2 border-slate-200 dark:border-slate-700 backdrop-blur-sm relative z-[100]">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => onNavigate(session ? 'home' : 'login')} 
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-firefly-orange rounded-lg px-2 py-1"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-firefly-amber via-firefly-orange to-firefly-pink rounded-xl flex items-center justify-center shadow-md">
              <Heart className="w-5 h-5 text-slate-900" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">ATlast</h1>
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
              <div className="relative z-[9999]" ref={menuRef}>
                <button 
                  onClick={() => setShowMenu(!showMenu)} 
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-firefly-orange"
                >
                  {session?.avatar ? (
                    <img src={session.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-firefly-cyan to-blue-500 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-white font-bold text-sm">{session?.handle?.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 hidden sm:inline">@{session?.handle}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-600 dark:text-slate-400 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
                </button>

                {showMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border-2 border-slate-200 dark:border-slate-700 py-2 z-[9999]">
                    <div className="px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{session?.displayName || session.handle}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">@{session?.handle}</div>
                    </div>
                    <button 
                      onClick={() => { setShowMenu(false); onNavigate('home'); }} 
                      className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
                    >
                      <Home className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      <span className="text-slate-900 dark:text-slate-100">Dashboard</span>
                    </button>
                    <button 
                      onClick={() => { setShowMenu(false); onNavigate('login'); }} 
                      className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
                    >
                      <Heart className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      <span className="text-slate-900 dark:text-slate-100">About</span>
                    </button>
                    <div className="border-t-2 border-slate-200 dark:border-slate-700 my-2"></div>
                    <button 
                      onClick={() => { setShowMenu(false); onLogout(); }} 
                      className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left text-red-600 dark:text-red-400"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}