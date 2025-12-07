import type { PuzzleDifficulty } from "../types/puzzle.types";
import { createSeededRandom } from "./seededRandom";

export type PolyCell = { row: number; col: number };

type ShapeKind = "tetromino" | "pentomino";

type ShapeBase = {
  id: string;
  kind: ShapeKind;
  cells: PolyCell[];
};

type ShapeVariant = {
  id: string;
  baseId: string;
  kind: ShapeKind;
  cells: PolyCell[];
  width: number;
  height: number;
  area: number;
};

type Placement = {
  variant: ShapeVariant;
  origin: { row: number; col: number };
};

export type GeneratedPiece = {
  id: string;
  kind: ShapeKind;
  shapeId: string;
  cells: PolyCell[];
  hintPlacement: {
    origin: { row: number; col: number };
    cells: PolyCell[];
  };
};

export type GeneratedPolyominoPuzzle = {
  size: number;
  pieces: GeneratedPiece[];
  ghostMap: number[][];
};

const toCells = (tuples: Array<[number, number]>): PolyCell[] =>
  tuples.map(tuple => ({ row: tuple[0], col: tuple[1] }));

const TETROMINO_BASES: ShapeBase[] = [
  { id: "I", kind: "tetromino", cells: toCells([[0, 0], [0, 1], [0, 2], [0, 3]]) },
  { id: "O", kind: "tetromino", cells: toCells([[0, 0], [0, 1], [1, 0], [1, 1]]) },
  { id: "T", kind: "tetromino", cells: toCells([[0, 0], [0, 1], [0, 2], [1, 1]]) },
  { id: "L", kind: "tetromino", cells: toCells([[0, 0], [1, 0], [2, 0], [2, 1]]) },
  { id: "J", kind: "tetromino", cells: toCells([[0, 1], [1, 1], [2, 1], [2, 0]]) },
  { id: "S", kind: "tetromino", cells: toCells([[0, 1], [0, 2], [1, 0], [1, 1]]) },
  { id: "Z", kind: "tetromino", cells: toCells([[0, 0], [0, 1], [1, 1], [1, 2]]) },
];

const PENTOMINO_BASES: ShapeBase[] = [
  { id: "F", kind: "pentomino", cells: toCells([[0, 1], [1, 0], [1, 1], [1, 2], [2, 2]]) },
  { id: "I", kind: "pentomino", cells: toCells([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]) },
  { id: "L", kind: "pentomino", cells: toCells([[0, 0], [1, 0], [2, 0], [3, 0], [3, 1]]) },
  { id: "P", kind: "pentomino", cells: toCells([[0, 0], [0, 1], [1, 0], [1, 1], [1, 2]]) },
  { id: "N", kind: "pentomino", cells: toCells([[0, 1], [1, 1], [2, 1], [2, 0], [3, 0]]) },
  { id: "T", kind: "pentomino", cells: toCells([[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]]) },
  { id: "U", kind: "pentomino", cells: toCells([[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]]) },
  { id: "V", kind: "pentomino", cells: toCells([[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]]) },
  { id: "W", kind: "pentomino", cells: toCells([[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]]) },
  { id: "X", kind: "pentomino", cells: toCells([[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]]) },
  { id: "Y", kind: "pentomino", cells: toCells([[0, 1], [1, 1], [2, 1], [3, 1], [3, 0]]) },
  { id: "Z", kind: "pentomino", cells: toCells([[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]]) },
];

const normalizeCells = (cells: PolyCell[]): PolyCell[] => {
  const minRow = Math.min(...cells.map(cell => cell.row));
  const minCol = Math.min(...cells.map(cell => cell.col));
  return cells
    .map(cell => ({ row: cell.row - minRow, col: cell.col - minCol }))
    .sort((a, b) => (a.row === b.row ? a.col - b.col : a.row - b.row));
};

const rotateCells = (cells: PolyCell[]): PolyCell[] => {
  const maxRow = Math.max(...cells.map(cell => cell.row));
  const rotated = cells.map(cell => ({ row: cell.col, col: maxRow - cell.row }));
  return normalizeCells(rotated);
};

const flipCells = (cells: PolyCell[]): PolyCell[] => {
  const maxCol = Math.max(...cells.map(cell => cell.col));
  const flipped = cells.map(cell => ({ row: cell.row, col: maxCol - cell.col }));
  return normalizeCells(flipped);
};

export const transformPolyomino = (cells: PolyCell[], rotation: number, flipped: boolean): PolyCell[] => {
  let transformed = cells;
  if (flipped) {
    transformed = flipCells(transformed);
  }
  for (let i = 0; i < rotation; i += 1) {
    transformed = rotateCells(transformed);
  }
  return normalizeCells(transformed);
};

export const getPolyominoBounds = (cells: PolyCell[]) => {
  const maxRow = Math.max(...cells.map(cell => cell.row));
  const maxCol = Math.max(...cells.map(cell => cell.col));
  return { height: maxRow + 1, width: maxCol + 1 };
};

const buildVariants = (): ShapeVariant[] => {
  const variants: ShapeVariant[] = [];
  const bases = [...TETROMINO_BASES, ...PENTOMINO_BASES];

  bases.forEach(base => {
    const seen = new Set<string>();
    const pushVariant = (cells: PolyCell[]) => {
      const key = cells.map(cell => `${cell.row}:${cell.col}`).join("|");
      if (seen.has(key)) return;
      seen.add(key);
      const { height, width } = getPolyominoBounds(cells);
      variants.push({
        id: `${base.id}_${seen.size}`,
        baseId: base.id,
        kind: base.kind,
        cells,
        width,
        height,
        area: cells.length,
      });
    };

    const initial = normalizeCells(base.cells);
    pushVariant(initial);
    let rotated = initial;
    for (let i = 0; i < 3; i += 1) {
      rotated = rotateCells(rotated);
      pushVariant(rotated);
    }
    const mirrored = flipCells(initial);
    pushVariant(mirrored);
    let mirroredRot = mirrored;
    for (let i = 0; i < 3; i += 1) {
      mirroredRot = rotateCells(mirroredRot);
      pushVariant(mirroredRot);
    }
  });

  return variants;
};

const SHAPE_VARIANTS = buildVariants();

const computePieceCombos = (size: number) => {
  const area = size * size;
  const combos: Array<{ tetromino: number; pentomino: number }> = [];
  for (let pent = 0; pent <= Math.floor(area / 5); pent += 1) {
    const remainder = area - pent * 5;
    if (remainder < 0) continue;
    if (remainder % 4 !== 0) continue;
    combos.push({ pentomino: pent, tetromino: remainder / 4 });
  }
  return combos;
};

const pickComboForDifficulty = (
  combos: Array<{ tetromino: number; pentomino: number }>,
  difficulty: PuzzleDifficulty,
) => {
  if (combos.length === 0) {
    throw new Error("No valid shape combinations for this board size.");
  }
  if (combos.length === 1) {
    return combos[0];
  }

  const sorted = [...combos].sort((a, b) => a.pentomino - b.pentomino);
  if (difficulty === "easy") {
    return sorted[0];
  }
  if (difficulty === "hard") {
    return sorted[sorted.length - 1];
  }
  return sorted[Math.floor(sorted.length / 2)];
};

const shuffleIndices = (length: number, random: () => number): number[] => {
  const indices = Array.from({ length }, (_, index) => index);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
};

const tryAlignVariant = (
  variant: ShapeVariant,
  targetRow: number,
  targetCol: number,
  size: number,
  board: number[],
) => {
  for (const cell of variant.cells) {
    const originRow = targetRow - cell.row;
    const originCol = targetCol - cell.col;
    if (originRow < 0 || originCol < 0) {
      continue;
    }
    if (originRow + variant.height > size || originCol + variant.width > size) {
      continue;
    }
    const occupiedCells: PolyCell[] = [];
    let blocked = false;
    for (const part of variant.cells) {
      const row = part.row + originRow;
      const col = part.col + originCol;
      const index = row * size + col;
      if (board[index] !== -1) {
        blocked = true;
        break;
      }
      occupiedCells.push({ row, col });
    }
    if (blocked) {
      continue;
    }
    return { origin: { row: originRow, col: originCol }, cells: occupiedCells };
  }
  return null;
};

const searchPlacements = (
  size: number,
  combo: { tetromino: number; pentomino: number },
  random: () => number,
) => {
  const board = new Array(size * size).fill(-1);
  const tetVariants = SHAPE_VARIANTS.filter(
    variant => variant.kind === "tetromino" && variant.width <= size && variant.height <= size,
  );
  const pentVariants = SHAPE_VARIANTS.filter(
    variant => variant.kind === "pentomino" && variant.width <= size && variant.height <= size,
  );

  const placements: Placement[] = [];
  const totalCells = size * size;
  const totalPieces = combo.tetromino + combo.pentomino;

  let filledCells = 0;
  let tetUsed = 0;
  let pentUsed = 0;

  const dfs = (): boolean => {
    if (filledCells === totalCells) {
      return tetUsed === combo.tetromino && pentUsed === combo.pentomino;
    }
    if (placements.length >= totalPieces) {
      return false;
    }

    const targetIndex = board.indexOf(-1);
    if (targetIndex === -1) {
      return false;
    }
    const targetRow = Math.floor(targetIndex / size);
    const targetCol = targetIndex % size;

    const kindPriority: ShapeKind[] = [];
    if (pentUsed < combo.pentomino) {
      kindPriority.push("pentomino");
    }
    if (tetUsed < combo.tetromino) {
      kindPriority.push("tetromino");
    }
    if (kindPriority.length === 0) {
      return false;
    }

    for (const kind of kindPriority) {
      const variants = kind === "tetromino" ? tetVariants : pentVariants;
      if (variants.length === 0) {
        continue;
      }
      const variantOrder = shuffleIndices(variants.length, random);
      for (const variantIndex of variantOrder) {
        const variant = variants[variantIndex];
        const placement = tryAlignVariant(variant, targetRow, targetCol, size, board);
        if (!placement) {
          continue;
        }
        const placementIndex = placements.length;
        placement.cells.forEach(cell => {
          board[cell.row * size + cell.col] = placementIndex;
        });
        placements.push({ variant, origin: placement.origin });
        filledCells += variant.area;
        if (kind === "tetromino") {
          tetUsed += 1;
        } else {
          pentUsed += 1;
        }

        if (dfs()) {
          return true;
        }

        placement.cells.forEach(cell => {
          board[cell.row * size + cell.col] = -1;
        });
        placements.pop();
        filledCells -= variant.area;
        if (kind === "tetromino") {
          tetUsed -= 1;
        } else {
          pentUsed -= 1;
        }
      }
    }
    return false;
  };

  const success = dfs();
  if (!success) {
    return null;
  }
  return placements;
};

export const generatePolyominoPuzzle = (
  sizeInput: number,
  difficulty: PuzzleDifficulty,
  seed?: number,
): GeneratedPolyominoPuzzle => {
  const size = Math.min(6, Math.max(3, Math.round(sizeInput)));
  const combos = computePieceCombos(size);
  const combo = pickComboForDifficulty(combos, difficulty);

  const attempts = Math.max(40, size * 20);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const seeded = createSeededRandom((seed ?? Date.now()) + attempt * 97);
    const result = searchPlacements(size, combo, seeded);
    if (!result) {
      continue;
    }

    const pieces: GeneratedPiece[] = result.map((placement, index) => ({
      id: `piece-${index}`,
      kind: placement.variant.kind,
      shapeId: placement.variant.baseId,
      cells: placement.variant.cells,
      hintPlacement: {
        origin: placement.origin,
        cells: placement.variant.cells.map(cell => ({
          row: cell.row + placement.origin.row,
          col: cell.col + placement.origin.col,
        })),
      },
    }));

    const ghostMap = Array.from({ length: size }, () => Array(size).fill(-1));
    result.forEach((placement, index) => {
      placement.variant.cells.forEach(cell => {
        const row = cell.row + placement.origin.row;
        const col = cell.col + placement.origin.col;
        ghostMap[row][col] = index;
      });
    });

    return { size, pieces, ghostMap };
  }

  throw new Error("퍼즐을 생성하지 못했습니다. 다른 설정으로 다시 시도해 주세요.");
};
