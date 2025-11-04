import { useState } from "react";
import { Heart, Upload, Search, ArrowRight } from "lucide-react";

interface LoginPageProps {
  onSubmit: (handle: string) => void;
  session?: { handle: string } | null;
  onNavigate?: (step: 'home') => void;
}

export default function LoginPage({ onSubmit, session, onNavigate }: LoginPageProps) {
  const [handle, setHandle] = useState("");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(handle);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        
        {/* Hero Section - Side by side on desktop */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start mb-12 md:mb-16">
          {/* Left: Welcome */}
          <div className="text-center md:text-left">
            <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mb-4 md:mb-6 shadow-xl">
              <Heart className="w-10 h-10 md:w-12 md:h-12 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">
              Welcome to ATlast
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-gray-700 dark:text-gray-300 mb-6">
              Reunite with your community on the ATmosphere
            </p>
            
            {/* Privacy Notice - visible on mobile */}
            <div className="md:hidden mt-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your data is processed and stored by our servers if you enable DM notifications. This is to help you find matches and reconnect with your community.
              </p>
            </div>
          </div>

          {/* Right: Login Card or Dashboard Button */}
          <div className="w-full">
            {session ? (
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 border border-gray-100 dark:border-gray-700">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Heart className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    You're logged in!
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Welcome back, @{session.handle}
                  </p>
                </div>

                <button
                  onClick={() => onNavigate?.('home')}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-800 focus:outline-none flex items-center justify-center space-x-2"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 md:p-8 border border-gray-100 dark:border-gray-700">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">
                  Get Started
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                  Connect your ATmosphere account to begin
                </p>

                <form onSubmit={handleSubmit} className="space-y-4" method="post">
                  <div>
                    <label htmlFor="atproto-handle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Your ATmosphere Handle
                    </label>
                    <input
                      id="atproto-handle"
                      type="text"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="yourname.bsky.social"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      aria-required="true"
                      aria-describedby="handle-description"
                    />
                    <p id="handle-description" className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Enter your full ATmosphere handle (e.g., username.bsky.social or yourname.com)
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-800 focus:outline-none"
                    aria-label="Connect to the ATmosphere"
                  >
                    Connect to the ATmosphere
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-300">Secure OAuth Connection</p>
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              Upload Your Data
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Import your following lists from Twitter, TikTok, Instagram, and more. Your data stays private.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              Find Matches
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              We'll search the ATmosphere to find which of your follows have already migrated.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center mb-4">
              <Heart className="w-6 h-6 text-pink-600 dark:text-pink-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              Reconnect Instantly
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Follow everyone at once or pick and choose. Build your community on the ATmosphere.
            </p>
          </div>
        </div>

        {/* Privacy Notice - desktop only */}
        <div className="hidden md:block text-center mb-8">
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Your data is processed and stored by our servers if you enable DM notifications. This is to help you find matches and reconnect with your community.
          </p>
        </div>

        {/* How It Works */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-8">
            How It Works
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg" aria-hidden="true">
                1
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Connect</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sign in with your ATmosphere account</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg" aria-hidden="true">
                2
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Upload</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Import your following data from other platforms</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-pink-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg" aria-hidden="true">
                3
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Match</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">We find your people on the ATmosphere</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg" aria-hidden="true">
                4
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Follow</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Reconnect with your community</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}