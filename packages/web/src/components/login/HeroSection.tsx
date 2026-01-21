import FireflyLogo from "../../assets/at-firefly-logo.svg?react";

interface HeroSectionProps {
  reducedMotion?: boolean;
}

export default function HeroSection({
  reducedMotion = false,
}: HeroSectionProps) {
  return (
    <div className="text-center md:text-left">
      <div className="mb-4 justify-center md:justify-start">
        <div className="logo-glow-container">
          <FireflyLogo className="w-50 h-15" />
        </div>
      </div>

      <h1 className="mb-3 bg-gradient-to-r from-purple-600 via-cyan-500 to-pink-500 bg-clip-text text-5xl font-bold text-transparent dark:from-cyan-300 dark:via-purple-300 dark:to-pink-300 md:mb-4 md:text-6xl">
        ATlast
      </h1>
      <p className="mb-2 text-xl font-medium text-purple-900 dark:text-cyan-100 md:text-2xl lg:text-2xl">
        Find Your Light in the ATmosphere
      </p>
      <p className="mb-2 text-purple-750 dark:text-cyan-250">
        Reconnect with your internet, one firefly at a time
      </p>

      {/* Decorative firefly trail - only show if motion enabled */}
      {!reducedMotion && (
        <div
          className="mt-8 flex justify-center space-x-2 md:justify-start"
          aria-hidden="true"
        >
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="size-2 rounded-full bg-orange-500 dark:bg-amber-400"
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
  );
}
