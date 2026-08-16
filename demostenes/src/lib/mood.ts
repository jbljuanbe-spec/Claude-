import type { Mood } from "@prisma/client";

export const MOOD_LABEL: Record<Mood, string> = {
  MUY_MAL: "muy mal",
  MAL: "mal",
  NEUTRO: "neutro",
  BIEN: "bien",
  MUY_BIEN: "muy bien",
};

export const MOOD_OPTIONS: Mood[] = ["MUY_MAL", "MAL", "NEUTRO", "BIEN", "MUY_BIEN"];
