import { useState, useRef, useEffect } from "react";
import "actor-typeahead";
import { ArrowRight, AlertCircle, Info } from "lucide-react";
import { useFormValidation } from "../hooks/useFormValidation";
import { validateHandle } from "../lib/validation";
import { useRotatingPlaceholder } from "../hooks/useRotatingPlaceholder";
import HeroSection from "../components/login/HeroSection";
import ValuePropsSection from "../components/login/ValuePropsSection";
import HowItWorksSection from "../components/login/HowItWorksSection";
import HandleInput from "../components/login/HandleInput";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [strippedAtMessage, setStrippedAtMessage] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const placeholder = useRotatingPlaceholder();

  const { fields, setValue, validate, getFieldProps } = useFormValidation({
    handle: "",
  });

  // Sync typeahead selection with form state and fetch avatar
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    let debounceTimer: ReturnType<typeof setTimeout>;

    const fetchAvatar = async (handle: string) => {
      if (!handle || handle.length < 3) {
        setSelectedAvatar(null);
        return;
      }

      try {
        const url = new URL(
          "xrpc/app.bsky.actor.searchActorsTypeahead",
          "https://public.api.bsky.app"
        );
        url.searchParams.set("q", handle);
        url.searchParams.set("limit", "1");

        const res = await fetch(url);
        const json = await res.json();

        if (json.actors?.[0]?.avatar) {
          setSelectedAvatar(json.actors[0].avatar);
        } else {
          setSelectedAvatar(null);
        }
      } catch (error) {
        // Silently fail - avatar is optional
        setSelectedAvatar(null);
      }
    };

    const handleInputChange = () => {
      let value = input.value.trim();

      // Strip leading @ if present
      if (value.startsWith("@")) {
        value = value.substring(1);
        input.value = value;

        // Show message once
        if (!strippedAtMessage) {
          setStrippedAtMessage(true);
          setTimeout(() => setStrippedAtMessage(false), 3000);
        }
      }

      // Update form state
      setValue("handle", value);

      // Debounce avatar fetch
      clearTimeout(debounceTimer);
      if (value === "") {
        setSelectedAvatar(null);
      } else {
        debounceTimer = setTimeout(() => fetchAvatar(value), 300);
      }
    };

    // Listen for input and change events
    input.addEventListener("input", handleInputChange);
    input.addEventListener("change", handleInputChange);

    return () => {
      input.removeEventListener("input", handleInputChange);
      input.removeEventListener("change", handleInputChange);
      clearTimeout(debounceTimer);
    };
  }, [setValue, strippedAtMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Get the value directly from the input (in case form state is stale)
    let currentHandle = (inputRef.current?.value || fields.handle.value).trim();

    // Strip leading @ one more time to be sure
    if (currentHandle.startsWith("@")) {
      currentHandle = currentHandle.substring(1);
    }

    setValue("handle", currentHandle);

    // Validate
    const isValid = validate("handle", validateHandle);

    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(currentHandle);
    } catch (error) {
      // Error handling is done in parent component
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Hero Section - Side by side on desktop */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start mb-12 md:mb-16">
          <HeroSection reducedMotion={reducedMotion} />

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
                  Reconnect in the ATmosphere as:
                </p>

                <form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                  method="post"
                >
                  <div>
                    <actor-typeahead rows={5}>
                      <HandleInput
                        ref={inputRef}
                        id="atproto-handle"
                        {...getFieldProps("handle")}
                        placeholder={placeholder}
                        error={fields.handle.touched && !!fields.handle.error}
                        selectedAvatar={selectedAvatar}
                        aria-required="true"
                        aria-invalid={
                          fields.handle.touched && !!fields.handle.error
                        }
                        aria-describedby={
                          fields.handle.error
                            ? "handle-error"
                            : "handle-description"
                        }
                        disabled={isSubmitting}
                      />
                    </actor-typeahead>
                    {strippedAtMessage && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-cyan-700 dark:text-cyan-300">
                        <Info className="w-4 h-4 flex-shrink-0" />
                        <span>
                          No need for the @ symbol - we've removed it for you!
                        </span>
                      </div>
                    )}
                    {fields.handle.touched && fields.handle.error && (
                      <div
                        id="handle-error"
                        className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
                        role="alert"
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{fields.handle.error}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-firefly-banner dark:bg-firefly-banner-dark text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl focus:ring-4 focus:ring-orange-500 dark:focus:ring-amber-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    aria-label="Connect to the ATmosphere"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      "Join the Swarm"
                    )}
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
                        You will be directed to your account to authorize
                        access. We never see your password and you can revoke
                        access anytime.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <ValuePropsSection />
        <HowItWorksSection />
      </div>
    </div>
  );
}
