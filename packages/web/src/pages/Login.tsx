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
import Tooltip from "../components/common/Tooltip";

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
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        {/* Hero Section - Side by side on desktop */}
        <div className="mb-12 grid items-start gap-8 md:mb-16 md:grid-cols-2 md:gap-12">
          <HeroSection reducedMotion={reducedMotion} />

          {/* Right: Login Card or Dashboard Button */}
          <div className="w-full">
            {session ? (
              <div className="rounded-3xl border-2 border-cyan-500/30 bg-white/50 p-8 shadow-2xl backdrop-blur-xl dark:border-purple-500/30 dark:bg-slate-900/50">
                <div className="mb-6 text-center">
                  <h2 className="mb-2 text-2xl font-bold text-purple-950 dark:text-cyan-50">
                    You're logged in!
                  </h2>
                  <p className="text-purple-750 dark:text-cyan-250">
                    Welcome back, @{session.handle}
                  </p>
                </div>

                <button
                  onClick={() => onNavigate?.("home")}
                  className="flex w-full items-center justify-center space-x-2 rounded-xl bg-firefly-banner py-4 text-lg font-bold text-white shadow-lg transition-all hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-orange-500 dark:bg-firefly-banner-dark dark:focus:ring-amber-400"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="size-5" />
                </button>
              </div>
            ) : (
              <div className="rounded-3xl border-2 border-cyan-500/30 bg-white/50 p-8 shadow-2xl backdrop-blur-xl dark:border-purple-500/30 dark:bg-slate-900/50">
                <h2 className="mb-2 text-center text-2xl font-bold text-purple-950 dark:text-cyan-50">
                  Light Up Your Network
                </h2>
                <p className="mb-6 text-center text-purple-750 dark:text-cyan-250">
                  Reconnect in the ATmosphere
                  <sup className="ml-0.5">
                    <Tooltip
                      content={
                        <div className="text-left">
                          <p className="mb-1 font-semibold">
                            What's the ATmosphere?
                          </p>
                          <p className="text-xs leading-relaxed">
                            The <strong>ATmosphere</strong> is a shared home for
                            social apps using one login. Your follows stay with
                            you, even if you change apps.
                          </p>
                        </div>
                      }
                    />
                  </sup>{" "}
                </p>

                <form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                  method="post"
                >
                  <div>
                    <label
                      htmlFor="atproto-handle"
                      className="mb-2 block text-sm font-semibold text-purple-900 dark:text-cyan-100"
                    >
                      Your ATmosphere Handle
                    </label>
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
                        <Info className="size-4 flex-shrink-0" />
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
                        <AlertCircle className="size-4 flex-shrink-0" />
                        <span>{fields.handle.error}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center rounded-xl bg-firefly-banner py-4 text-lg font-bold text-white shadow-lg transition-all hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-firefly-banner-dark dark:focus:ring-amber-400"
                    aria-label="Connect to the ATmosphere"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="mr-2 size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      "Join the Swarm"
                    )}
                  </button>
                </form>

                <div className="mt-6 border-t-2 border-cyan-500/30 pt-6 dark:border-purple-500/30">
                  <div className="flex items-start space-x-2 text-sm text-purple-900 dark:text-cyan-100">
                    <svg
                      className="mt-0.5 size-5 flex-shrink-0 text-green-500"
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
                      <p className="mt-1 text-xs">
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
