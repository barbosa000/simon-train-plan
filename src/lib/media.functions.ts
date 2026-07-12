import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Simple in-memory cache per worker instance
const cache = new Map<string, { videoId: string; ts: number }>();
const TTL = 1000 * 60 * 60 * 12; // 12h

export const resolveExerciseVideo = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const key = data.query.trim().toLowerCase();
    const hit = cache.get(key);
    if (hit && Date.now() - hit.ts < TTL) return { videoId: hit.videoId };

    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(data.query)}&hl=pt&gl=BR`;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        },
      });
      if (!res.ok) return { videoId: null };
      const html = await res.text();
      // Look for the first videoId (11 chars)
      const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      const videoId = match?.[1] ?? null;
      if (videoId) cache.set(key, { videoId, ts: Date.now() });
      return { videoId };
    } catch {
      return { videoId: null };
    }
  });
