import type { AtprotoApp } from "../types/settings";

export const ATPROTO_APPS: Record<string, AtprotoApp> = {
  bluesky: {
    id: "bluesky",
    name: "Bluesky",
    description: "The main ATmosphere social network",
    link: "https://bsky.app/",
    icon: "🦋",
    action: "Follow",
    followLexicon: "app.bsky.graph.follow",
    enabled: true,
  },
  tangled: {
    id: "tangled",
    name: "Tangled",
    description: "Alternative following for developers & creators",
    link: "https://tangled.org/",
    icon: "🐑",
    action: "Follow",
    followLexicon: "sh.tangled.graph.follow",
    enabled: true,
  },
  spark: {
    id: "spark",
    name: "Spark",
    description: "Short-form video focused social",
    link: "https://sprk.so/",
    icon: "✨",
    action: "Follow",
    followLexicon: "so.sprk.graph.follow",
    enabled: true,
  },
  lists: {
    id: "bsky list",
    name: "Bluesky List",
    description: "Organize into custom Bluesky lists",
    link: "https://bsky.app/",
    icon: "📃",
    action: "Add to",
    followLexicon: "app.bsky.graph.follow",
    enabled: false, // Not yet implemented
  },
};

export function getAppById(id: string): AtprotoApp | undefined {
  return ATPROTO_APPS[id];
}

export function getEnabledApps(): AtprotoApp[] {
  return Object.values(ATPROTO_APPS).filter((app) => app.enabled);
}
