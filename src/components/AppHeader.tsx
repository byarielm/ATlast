import { useState, useEffect, useRef } from "react";
import { Heart, Home, LogOut, ChevronDown } from "lucide-react";

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
}

export default function AppHeader({ session, onLogout, onNavigate, currentStep }: AppHeaderProps) {
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
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => onNavigate(session ? 'home' : 'login')} className="flex items-center space-x-3 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-2 py-1">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">ATlast</h1>
          </button>

          {session && (
            <div className="relative" ref={menuRef}>
              <button onClick={() => setShowMenu(!showMenu)} className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
                {session?.avatar ? (
                  <img src={session.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{session?.handle?.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 hidden sm:inline">@{session?.handle}</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{session?.displayName || session.handle}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">@{session?.handle}</div>
                  </div>
                  <button onClick={() => { setShowMenu(false); onNavigate('home'); }} className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left">
                    <Home className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-900 dark:text-gray-100">Dashboard</span>
                  </button>
                  <button onClick={() => { setShowMenu(false); onNavigate('login'); }} className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left">
                    <Heart className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-900 dark:text-gray-100">About</span>
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                  <button onClick={() => { setShowMenu(false); onLogout(); }} className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left text-red-600 dark:text-red-400">
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
  );
}