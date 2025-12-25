import { LucideIcon } from "lucide-react";

interface ValuePropCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function ValuePropCard({
  icon: Icon,
  title,
  description,
}: ValuePropCardProps) {
  return (
    <div className="bg-white/50 border-cyan-500/30 hover:border-cyan-400 dark:bg-slate-900/50 dark:border-purple-500/30 dark:hover:border-purple-400 backdrop-blur-xl rounded-2xl p-6 border-2 transition-all hover:scale-105 shadow-lg">
      <div className="w-12 h-12 bg-gradient-to-br from-amber-300 to-orange-600 rounded-xl flex items-center justify-center mb-4 shadow-md">
        <Icon className="w-6 h-6 text-slate-900" />
      </div>
      <h3 className="text-lg font-bold text-purple-950 dark:text-cyan-50 mb-2">
        {title}
      </h3>
      <p className="text-purple-750 dark:text-cyan-250 text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}
