interface FireflyProps {
  delay?: number;
  duration?: number;
}

export default function Firefly({ delay = 0, duration = 3 }: FireflyProps) {
  const style = {
    animation: `float ${duration}s ease-in-out ${delay}s infinite`,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
  };

  return (
    <div
      className="pointer-events-none absolute size-1 rounded-full bg-firefly-amber opacity-40 dark:bg-firefly-glow"
      style={style}
      aria-hidden="true"
    >
      <div className="absolute inset-0 animate-pulse rounded-full bg-firefly-glow blur-sm dark:bg-firefly-amber" />
    </div>
  );
}
