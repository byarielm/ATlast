import {
  Upload,
  History,
  Settings,
  BookOpen,
  Grid3x3,
  LucideIcon,
} from "lucide-react";

export type TabId = "upload" | "history" | "settings" | "guides" | "apps";

interface Tab {
  id: TabId;
  icon: LucideIcon;
  label: string;
}

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: Tab[] = [
  { id: "upload", icon: Upload, label: "Upload" },
  { id: "history", icon: History, label: "History" },
  { id: "settings", icon: Settings, label: "Settings" },
  { id: "guides", icon: BookOpen, label: "Guides" },
  { id: "apps", icon: Grid3x3, label: "Apps" },
];

export default function TabNavigation({
  activeTab,
  onTabChange,
}: TabNavigationProps) {
  return (
    <div className="scrollbar-hide overflow-x-auto px-4">
      <div className="flex min-w-max space-x-1 border-b-2 border-cyan-500/30 dark:border-purple-500/30">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center space-x-2 whitespace-nowrap border-b-2 px-4 py-3 transition-all ${
                activeTab === tab.id
                  ? "border-orange-500 text-orange-650 dark:border-orange-400 dark:text-amber-400"
                  : "border-transparent text-purple-750 hover:text-purple-900 dark:text-cyan-250 dark:hover:text-cyan-100"
              }`}
            >
              <Icon className="size-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
