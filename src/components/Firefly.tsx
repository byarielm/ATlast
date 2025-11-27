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
      className="absolute w-1 h-1 bg-firefly-amber dark:bg-firefly-glow rounded-full opacity-40 pointer-events-none"
      style={style}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-firefly-glow dark:bg-firefly-amber rounded-full animate-pulse blur-sm" />
    </div>
  );
}
