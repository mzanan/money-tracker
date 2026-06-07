import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Money Tracker",
    short_name: "Money",
    description: "Track income and expenses, multi-currency, simple.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    orientation: "portrait",
    lang: "en",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    share_target: {
      action: "/api/share/screenshot",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        files: [
          {
            name: "image",
            accept: ["image/png", "image/jpeg", "image/webp"],
          },
        ],
      },
    },
  };
}
