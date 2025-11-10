import { useState } from "react";
import { Heart, Upload, Search, ArrowRight } from "lucide-react";

interface LoginPageProps {
  onSubmit: (handle: string) => void;
  session?: { handle: string } | null;
  onNavigate?: (step: 'home') => void;
  reducedMotion?: boolean;
}

export default function LoginPage({ onSubmit, session, onNavigate, reducedMotion = false }: LoginPageProps) {
  const [handle, setHandle] = useState("");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(handle);
  };
  
  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        
        {/* Hero Section - Side by side on desktop */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start mb-12 md:mb-16">
          {/* Left: Welcome */}
          <div className="text-center md:text-left">
            <div className="inline-flex items-center justify-center mb-6 relative">
              <div 
                className={`w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-firefly-amber via-firefly-orange to-firefly-pink rounded-3xl flex items-center justify-center relative shadow-xl ${
                  reducedMotion ? '' : 'animate-glow-pulse'
                }`}
              >
                <Heart className="w-10 h-10 md:w-12 md:h-12 text-slate-900" aria-hidden="true" />
                {/* Firefly mascot hint */}
                <div 
                  className={`absolute -top-2 -right-2 w-8 h-8 bg-firefly-glow rounded-full flex items-center justify-center shadow-lg ${
                    reducedMotion ? '' : 'animate-bounce'
                  }`}
                  aria-hidden="true"
                >
                  <div className="w-4 h-4 bg-firefly-amber rounded-full" />
                </div>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-3 md:mb-4">
              ATlast
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-slate-800 dark:text-slate-100 mb-2 font-medium">
              Find Your Light in the ATmosphere
            </p>
            <p className="text-slate-700 dark:text-slate-300 mb-6">
              Reconnect with your internet, one firefly at a time ✨
            </p>
            
            {/* Decorative firefly trail - only show if motion enabled */}
            {!reducedMotion && (
              <div className="mt-8 flex justify-center md:justify-start space-x-2" aria-hidden="true">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-firefly-amber dark:bg-firefly-glow"
                    style={{
                      opacity: 1 - i * 0.15,
                      animation: `float ${2 + i * 0.3}s ease-in-out infinite`,
                      animationDelay: `${i * 0.2}s`
                    }}
                  />
                ))}
              </div>
            )}
            
            {/* Privacy Notice - visible on mobile */}
            <div className="md:hidden mt-6">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Your data is processed and stored by our servers. This helps you find matches and reconnect with your community.
              </p>
            </div>
          </div>

          {/* Right: Login Card or Dashboard Button */}
          <div className="w-full">
            {session ? (
              <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border-2 border-slate-200 dark:border-slate-700">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-firefly-amber via-firefly-orange to-firefly-pink rounded-full mx-auto mb-4 flex items-center justify-center shadow-md">
                    <Heart className="w-8 h-8 text-slate-900" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    You're logged in!
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300">
                    Welcome back, @{session.handle}
                  </p>
                </div>

                <button
                  onClick={() => onNavigate?.('home')}
                  className="w-full bg-gradient-to-r from-firefly-amber via-firefly-orange to-firefly-pink hover:from-amber-600 hover:via-orange-600 hover:to-pink-600 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl focus:ring-4 focus:ring-orange-300 dark:focus:ring-orange-800 focus:outline-none flex items-center justify-center space-x-2"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 md:p-8 border-2 border-slate-200 dark:border-slate-700">
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 text-center">
                  Light Up Your Network
                </h2>
                <p className="text-slate-700 dark:text-slate-300 text-center mb-6">
                  Connect your ATmosphere account to begin
                </p>

                <form onSubmit={handleSubmit} className="space-y-4" method="post">
                  <div>
                    <label htmlFor="atproto-handle" className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Your ATmosphere Handle
                    </label>
                    <input
                      id="atproto-handle"
                      type="text"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="yourname.bsky.social"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-firefly-orange focus:border-transparent transition-all"
                      aria-required="true"
                      aria-describedby="handle-description"
                    />
                    <p id="handle-description" className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                      Enter your full ATmosphere handle (e.g., username.bsky.social or yourname.com)
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-firefly-amber via-firefly-orange to-firefly-pink hover:from-amber-600 hover:via-orange-600 hover:to-pink-600 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl focus:ring-4 focus:ring-orange-300 dark:focus:ring-orange-800 focus:outline-none"
                    aria-label="Connect to the ATmosphere"
                  >
                    Join the Swarm ✨
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t-2 border-slate-200 dark:border-slate-700">
                  <div className="flex items-start space-x-2 text-sm text-slate-700 dark:text-slate-300">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">Secure OAuth Connection</p>
                      <p className="text-xs mt-1">We use official AT Protocol OAuth. We never see your password and you can revoke access anytime.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Value Props */}
        <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-12 md:mb-16 max-w-5xl mx-auto">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl p-6 shadow-lg border-2 border-slate-200 dark:border-slate-700 hover:border-firefly-orange dark:hover:border-firefly-orange transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-firefly-amber to-firefly-orange rounded-xl flex items-center justify-center mb-4 shadow-md">
              <Upload className="w-6 h-6 text-slate-900" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Share Your Light
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
              Import your following lists. Your data stays private, your connections shine bright.
            </p>
          </div>

          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl p-6 shadow-lg border-2 border-slate-200 dark:border-slate-700 hover:border-firefly-orange dark:hover:border-firefly-orange transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-firefly-cyan to-blue-500 rounded-xl flex items-center justify-center mb-4 shadow-md">
              <Search className="w-6 h-6 text-slate-900" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Find Your Swarm
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
              Watch as fireflies light up - discover which friends have already migrated to the ATmosphere.
            </p>
          </div>

          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl p-6 shadow-lg border-2 border-slate-200 dark:border-slate-700 hover:border-firefly-orange dark:hover:border-firefly-orange transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-firefly-pink to-purple-500 rounded-xl flex items-center justify-center mb-4 shadow-md">
              <Heart className="w-6 h-6 text-slate-900" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Sync Your Glow
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
              Reconnect instantly. Follow everyone at once or pick and choose - light up together.
            </p>
          </div>
        </div>

        {/* Privacy Notice - desktop only */}
        <div className="hidden md:block text-center mb-8">
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Your data is processed and stored by our servers. This helps you find matches and reconnect with your community.
          </p>
        </div>

        {/* How It Works */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-slate-100 mb-8">
            How It Works
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-firefly-orange text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg shadow-md" aria-hidden="true">
                1
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Connect</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">Sign in with your ATmosphere account</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-firefly-pink text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg shadow-md" aria-hidden="true">
                2
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Upload</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">Import your following data from other platforms</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-firefly-cyan text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg shadow-md" aria-hidden="true">
                3
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Match</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">We find your fireflies in the ATmosphere</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-firefly-amber text-slate-900 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg shadow-md" aria-hidden="true">
                4
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Follow</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">Reconnect with your community</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}