import { LucideIcon } from "lucide-react";

interface PlaceholderTabProps {
  icon: LucideIcon;
  title: string;
  message: string;
}

export default function PlaceholderTab({
  icon: Icon,
  title,
  message,
}: PlaceholderTabProps) {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center space-x-3">
        <h2 className="text-xl font-bold text-purple-950 dark:text-cyan-50">
          {title}
        </h2>
      </div>
      <p className="text-purple-900 dark:text-cyan-100">{message}</p>
    </div>
  );
}
