import { createFileRoute } from "@tanstack/react-router";
import JumpGame from "@/components/JumpGame";

const TITLE = "Jump Master — 2D Side-Scrolling Obstacle Game";
const DESCRIPTION =
  "Play Jump Master, a free 2D side-scrolling platformer: jump and double-jump over spikes, customize your character, and set your own hotkeys.";
const URL = "https://the-jumping-game.lovable.app/";

export const Route = createFileRoute("/")({
  component: JumpGame,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "VideoGame",
          name: "Jump Master",
          description: DESCRIPTION,
          url: URL,
          applicationCategory: "GameApplication",
          operatingSystem: "Any",
          genre: "Platformer",
philosophy: undefined,
        }),
      },
    ],
  }),
});
