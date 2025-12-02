export type PuzzleDifficulty = "easy" | "medium" | "hard";

export type PuzzlePolicyPayload = {
  size: 3 | 4 | 5 | 6;
  difficulty: PuzzleDifficulty;
  seed?: number | null;
};
