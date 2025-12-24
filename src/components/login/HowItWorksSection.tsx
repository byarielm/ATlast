import StepCard from "./StepCard";

export default function HowItWorksSection() {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-center text-purple-950 dark:text-cyan-50 mb-8">
        How It Works
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StepCard
          number={1}
          color="orange"
          title="Connect"
          description="Sign in with your ATmosphere account"
        />
        <StepCard
          number={2}
          color="cyan"
          title="Upload"
          description="Import your following data from other platforms"
        />
        <StepCard
          number={3}
          color="pink"
          title="Match"
          description="We find your fireflies in the ATmosphere"
        />
        <StepCard
          number={4}
          color="amber"
          title="Follow"
          description="Reconnect with your community"
        />
      </div>
    </div>
  );
}
