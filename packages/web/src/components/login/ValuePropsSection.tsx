import { Heart, Upload, Search } from "lucide-react";
import ValuePropCard from "./ValuePropCard";

export default function ValuePropsSection() {
  return (
    <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-12 md:mb-16 max-w-5xl mx-auto">
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
