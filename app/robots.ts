import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/exam/", "/api/", "/aktivasi/"] },
      // Crawler pelatihan AI umum
      { userAgent: ["GPTBot", "CCBot", "ClaudeBot", "Google-Extended", "Bytespider", "PerplexityBot"], disallow: "/" },
    ],
  };
}
