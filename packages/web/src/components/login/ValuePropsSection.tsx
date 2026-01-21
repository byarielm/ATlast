import { Heart, Upload, Search } from "lucide-react";
import ValuePropCard from "./ValuePropCard";

export default function ValuePropsSection() {
  return (
    <div className="mx-auto mb-12 grid max-w-5xl gap-4 md:mb-16 md:grid-cols-3 md:gap-6">
      <ValuePropCard
        icon={Upload}
        title="Share Your Light"
        description="Import your following lists. Your data stays private, your connections shine bright."
      />
      <ValuePropCard
        icon={Search}
        title="Find Your Swarm"
        description="Watch as fireflies light up - discover which friends have already migrated to the ATmosphere."
      />
      <ValuePropCard
        icon={Heart}
        title="Sync Your Glow"
        description="Reconnect instantly. Follow everyone at once or pick and choose - light up together."
      />
    </div>
  );
}
