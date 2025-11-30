import type { AtprotoApp } from "../types/settings";

// Re-export for convenience
export type { AtprotoApp } from "../types/settings";

export const ATPROTO_APPS: Record<string, AtprotoApp> = {
  bluesky: {
    id: "bluesky",
    name: "Bluesky",
    description: "Social app built for better conversations.",
    link: "https://bsky.app/",
    icon: "https://web-cdn.bsky.app/static/apple-touch-icon.png",
    action: "Follow",
    followLexicon: "app.bsky.graph.follow",
    enabled: true,
  },
  tangled: {
    id: "tangled",
    name: "Tangled",
    description: "Tightly-knit social coding!",
    link: "https://tangled.org/",
    icon: "https://tangled.org/favicon.ico",
    action: "Follow",
    followLexicon: "sh.tangled.graph.follow",
    enabled: true,
  },
  spark: {
    id: "spark",
    name: "Spark",
    description:
      "Social that puts the user in control, dedicated to video and photo.",
    link: "https://sprk.so/",
    icon: "https://sprk.so/favicon.ico",
    action: "Follow",
    followLexicon: "so.sprk.graph.follow",
    enabled: true,
  },
  lists: {
    id: "bsky list",
    name: "Bluesky List",
    description: "Organize into custom Bluesky lists",
    link: "https://bsky.app",
    icon: "https://web-cdn.bsky.app/static/apple-touch-icon.png",
    action: "Add to",
    followLexicon: "app.bsky.graph.follow",
    enabled: false, // Not yet implemented
  },
};
