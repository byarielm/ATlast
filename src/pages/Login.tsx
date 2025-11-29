import { useState } from "react";
import { Heart, Upload, Search, ArrowRight } from "lucide-react";
import FireflyLogo from "../assets/at-firefly-logo.svg?react";

interface LoginPageProps {
  onSubmit: (handle: string) => void;
  session?: { handle: string } | null;
  onNavigate?: (step: "home") => void;
  reducedMotion?: boolean;
}

export default function LoginPage({
  onSubmit,
  session,
  onNavigate,
  reducedMotion = false,
}: LoginPageProps) {
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
            <div className="justify-center md:justify-start mb-4">
              <div className="logo-glow-container">
                <FireflyLogo className="w-50 h-15" />
              </div>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-cyan-500 to-pink-500 dark:from-cyan-300 dark:via-purple-300 dark:to-pink-300 bg-clip-text text-transparent mb-3 md:mb-4">
              ATlast
            </h1>
            <p className="text-xl md:text-2xl lg:text-2xl text-purple-900 dark:text-cyan-100 mb-2 font-medium">
              Find Your Light in the ATmosphere
            </p>
            <p className="text-purple-750 dark:text-cyan-250 mb-6">
              Reconnect with your internet, one firefly at a time ✨
            </p>

            {/* Decorative firefly trail - only show if motion enabled */}
            {!reducedMotion && (
              <div
                className="mt-8 flex justify-center md:justify-start space-x-2"
                aria-hidden="true"
              >
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-orange-500 dark:bg-amber-400"
                    style={{
                      opacity: 1 - i * 0.15,
                      animation: `float ${2 + i * 0.3}s ease-in-out infinite`,
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Login Card or Dashboard Button */}
          <div className="w-full">
            {session ? (
              <div className="bg-white/50 dark:bg-slate-900/50 border-cyan-500/30 dark:border-purple-500/30 backdrop-blur-xl rounded-3xl p-8 border-2 shadow-2xl">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-purple-950 dark:text-cyan-50 mb-2">
                    You're logged in!
                  </h2>
                  <p className="text-purple-750 dark:text-cyan-250">
                    Welcome back, @{session.handle}
                  </p>
                </div>

                <button
                  onClick={() => onNavigate?.("home")}
                  className="w-full bg-firefly-banner dark:bg-firefly-banner-dark text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl focus:ring-4 focus:ring-orange-500 dark:focus:ring-amber-400 focus:outline-none flex items-center justify-center space-x-2"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="bg-white/50 dark:bg-slate-900/50 border-cyan-500/30 dark:border-purple-500/30 backdrop-blur-xl rounded-3xl p-8 border-2 shadow-2xl">
                <h2 className="text-2xl font-bold text-purple-950 dark:text-cyan-50 mb-2 text-center">
                  Light Up Your Network
                </h2>
                <p className="text-purple-750 dark:text-cyan-250 text-center mb-6">
                  Connect your ATmosphere account to begin
                </p>

                <form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                  method="post"
                >
                  <div>
                    <label
                      htmlFor="atproto-handle"
                      className="block text-sm font-semibold text-purple-900 dark:text-cyan-100 mb-2"
                    >
                      Your ATmosphere Handle
                    </label>
                    <input
                      id="atproto-handle"
                      type="text"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="yourname.bsky.social"
                      className="w-full px-4 py-3 bg-purple-50/50 dark:bg-slate-900/50 border-2 border-cyan-500/50 dark:border-purple-500/30 rounded-xl text-purple-900 dark:text-cyan-100 placeholder-purple-750/80 dark:placeholder-cyan-250/80 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-amber-400 focus:border-transparent transition-all"
                      aria-required="true"
                      aria-describedby="handle-description"
                    />
                    {/*<p
                      id="handle-description"
                      className="text-xs text-slate-600 dark:text-slate-400 mt-2"
                    >
                      Enter your full ATmosphere handle (e.g.,
                      username.bsky.social or yourname.com)
                    </p>*/}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-firefly-banner dark:bg-firefly-banner-dark text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl focus:ring-4 focus:ring-orange-500 dark:focus:ring-amber-400 focus:outline-none"
                    aria-label="Connect to the ATmosphere"
                  >
                    Join the Swarm
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t-2 border-cyan-500/30 dark:border-purple-500/30">
                  <div className="flex items-start space-x-2 text-sm text-purple-900 dark:text-cyan-100">
                    <svg
                      className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <p className="font-semibold text-purple-950 dark:text-cyan-50">
                        Secure OAuth Connection
                      </p>
                      <p className="text-xs mt-1">
                        We use official AT Protocol OAuth. We never see your
                        password and you can revoke access anytime.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Value Props */}
        <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-12 md:mb-16 max-w-5xl mx-auto">
          <div className="bg-white/50 border-cyan-500/30 hover:border-cyan-400 dark:bg-slate-900/50 dark:border-purple-500/30 dark:hover:border-purple-400 backdrop-blur-xl rounded-2xl p-6 border-2 transition-all hover:scale-105 shadow-lg">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-300 to-orange-600 rounded-xl flex items-center justify-center mb-4 shadow-md">
              <Upload className="w-6 h-6 text-slate-900" />
            </div>
            <h3 className="text-lg font-bold text-purple-950 dark:text-cyan-50 mb-2">
              Share Your Light
            </h3>
            <p className="text-purple-750 dark:text-cyan-250 text-sm leading-relaxed">
              Import your following lists. Your data stays private, your
              connections shine bright.
            </p>
          </div>

          <div className="bg-white/50 border-cyan-500/30 hover:border-cyan-400 dark:bg-slate-900/50 dark:border-purple-500/30 dark:hover:border-purple-400 backdrop-blur-xl rounded-2xl p-6 border-2 transition-all hover:scale-105 shadow-lg">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-300 to-orange-600 rounded-xl flex items-center justify-center mb-4 shadow-md">
              <Search className="w-6 h-6 text-slate-900" />
            </div>
            <h3 className="text-lg font-bold text-purple-950 dark:text-cyan-50 mb-2">
              Find Your Swarm
            </h3>
            <p className="text-purple-750 dark:text-cyan-250 text-sm leading-relaxed">
              Watch as fireflies light up - discover which friends have already
              migrated to the ATmosphere.
            </p>
          </div>

          <div className="bg-white/50 border-cyan-500/30 hover:border-cyan-400 dark:bg-slate-900/50 dark:border-purple-500/30 dark:hover:border-purple-400 backdrop-blur-xl rounded-2xl p-6 border-2 transition-all hover:scale-105 shadow-lg">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-300 to-orange-600 rounded-xl flex items-center justify-center mb-4 shadow-md">
              <Heart className="w-6 h-6 text-slate-900" />
            </div>
            <h3 className="text-lg font-bold text-purple-950 dark:text-cyan-50 mb-2">
              Sync Your Glow
            </h3>
            <p className="text-purple-750 dark:text-cyan-250 text-sm leading-relaxed">
              Reconnect instantly. Follow everyone at once or pick and choose -
              light up together.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-purple-950 dark:text-cyan-50 mb-8">
            How It Works
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div
                className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg shadow-md"
                aria-hidden="true"
              >
                1
              </div>
              <h3 className="font-semibold text-purple-950 dark:text-cyan-50 mb-1">
                Connect
              </h3>
              <p className="text-sm text-purple-900 dark:text-cyan-100">
                Sign in with your ATmosphere account
              </p>
            </div>
            <div className="text-center">
              <div
                className="w-12 h-12 bg-cyan-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg shadow-md"
                aria-hidden="true"
              >
                2
              </div>
              <h3 className="font-semibold text-purple-950 dark:text-cyan-50 mb-1">
                Upload
              </h3>
              <p className="text-sm text-purple-900 dark:text-cyan-100">
                Import your following data from other platforms
              </p>
            </div>
            <div className="text-center">
              <div
                className="w-12 h-12 bg-pink-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg shadow-md"
                aria-hidden="true"
              >
                3
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Match
              </h3>
              <p className="text-sm text-purple-900 dark:text-cyan-100">
                We find your fireflies in the ATmosphere
              </p>
            </div>
            <div className="text-center">
              <div
                className="w-12 h-12 bg-amber-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg shadow-md"
                aria-hidden="true"
              >
                4
              </div>
              <h3 className="font-semibold text-purple-950 dark:text-cyan-50 mb-1">
                Follow
              </h3>
              <p className="text-sm text-purple-900 dark:text-cyan-100">
                Reconnect with your community
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
