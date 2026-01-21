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
    <div className="rounded-2xl border-2 border-cyan-500/30 bg-white/50 p-6 shadow-lg backdrop-blur-xl transition-all hover:scale-105 hover:border-cyan-400 dark:border-purple-500/30 dark:bg-slate-900/50 dark:hover:border-purple-400">
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-600 shadow-md">
        <Icon className="size-6 text-slate-900" />
      </div>
      <h3 className="mb-2 text-lg font-bold text-purple-950 dark:text-cyan-50">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-purple-750 dark:text-cyan-250">
        {description}
      </p>
    </div>
  );
}
