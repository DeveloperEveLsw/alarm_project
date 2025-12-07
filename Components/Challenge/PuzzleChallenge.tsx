import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import type { PuzzleDifficulty } from "../../types/puzzle.types";
import {
  generatePolyominoPuzzle,
  getPolyominoBounds,
  transformPolyomino,
  type GeneratedPiece,
  type PolyCell,
} from "../../utils/polyominoes";
import { createSeededRandom } from "../../utils/seededRandom";

type PieceState = {
  id: string;
  kind: "tetromino" | "pentomino";
  shapeId: string;
  color: string;
  cells: PolyCell[];
  rotation: number;
  flipped: boolean;
  origin: { row: number; col: number };
  locked: boolean;
  hintPlacement: GeneratedPiece["hintPlacement"];
};

const PIECE_COLORS = ["#f87171", "#fb923c", "#facc15", "#4ade80", "#34d399", "#38bdf8", "#818cf8", "#c084fc", "#f472b6", "#fca5a5"];

const DIFFICULTY_RULES: Record<
  PuzzleDifficulty,
  {
    hints: number | null;
    showGhost: boolean;
    timerSeconds: number | null;
  }
> = {
  easy: { hints: null, showGhost: true, timerSeconds: null },
  medium: { hints: 2, showGhost: false, timerSeconds: 210 },
  hard: { hints: 0, showGhost: false, timerSeconds: 150 },
};

const projectPieceCells = (piece: PieceState, originOverride?: { row: number; col: number }) => {
  const oriented = transformPolyomino(piece.cells, piece.rotation, piece.flipped);
  const origin = originOverride ?? piece.origin;
  return oriented.map(cell => ({ row: cell.row + origin.row, col: cell.col + origin.col }));
};

const clampOriginForPiece = (piece: PieceState, origin: { row: number; col: number }, boardSize: number) => {
  const oriented = transformPolyomino(piece.cells, piece.rotation, piece.flipped);
  const { height, width } = getPolyominoBounds(oriented);
  const maxRow = Math.max(0, boardSize - height);
  const maxCol = Math.max(0, boardSize - width);
  return {
    row: Math.min(maxRow, Math.max(0, origin.row)),
    col: Math.min(maxCol, Math.max(0, origin.col)),
  };
};

const buildPieceStates = (
  pieces: GeneratedPiece[],
  boardSize: number,
  seed?: number,
): PieceState[] => {
  const random = createSeededRandom(seed);
  return pieces.map((piece, index) => {
    const rotation = Math.floor(random() * 4);
    const flipped = random() > 0.5 ? true : false;
    return {
      id: piece.id,
      kind: piece.kind,
      shapeId: piece.shapeId,
      color: PIECE_COLORS[index % PIECE_COLORS.length],
      cells: piece.cells,
      rotation,
      flipped,
      origin: clampOriginForPiece(
        {
          id: piece.id,
          kind: piece.kind,
          shapeId: piece.shapeId,
          color: PIECE_COLORS[index % PIECE_COLORS.length],
          cells: piece.cells,
          rotation,
          flipped,
          origin: { row: 0, col: 0 },
          locked: false,
          hintPlacement: piece.hintPlacement,
        },
        { row: 0, col: 0 },
        boardSize,
      ),
      locked: false,
      hintPlacement: piece.hintPlacement,
    };
  });
};

export type PuzzleChallengeProps = {
  size: number;
  difficulty: PuzzleDifficulty;
  seed?: number;
  snoozeMinutes?: number[];
  onReady?: () => void;
  onComplete?: () => void;
  onSnooze?: (minutes?: number) => void;
  onTimeout?: () => void;
};

const PuzzleChallenge: React.FC<PuzzleChallengeProps> = ({
  size: rawSize,
  difficulty,
  seed,
  snoozeMinutes = [],
  onReady,
  onComplete,
  onSnooze,
  onTimeout,
}) => {
  const [status, setStatus] = useState<"playing" | "success" | "timeout" | "snoozed">("playing");

  const sanitizedSize = Math.min(6, Math.max(3, Math.round(rawSize)));
  const puzzle = useMemo(() => generatePolyominoPuzzle(sanitizedSize, difficulty, seed), [sanitizedSize, difficulty, seed]);
  const rules = DIFFICULTY_RULES[difficulty];

  const initialPieces = useMemo(() => buildPieceStates(puzzle.pieces, puzzle.size, seed), [puzzle, seed]);
  const [pieces, setPieces] = useState<PieceState[]>(initialPieces);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(initialPieces[0]?.id ?? null);
  const [hintsLeft, setHintsLeft] = useState<number | null>(rules.hints);
  const [timeLeft, setTimeLeft] = useState<number | null>(rules.timerSeconds);

  useEffect(() => {
    setPieces(initialPieces);
    setSelectedPieceId(initialPieces[0]?.id ?? null);
    setHintsLeft(rules.hints);
    setTimeLeft(rules.timerSeconds);
    setStatus("playing");
  }, [initialPieces, rules.hints, rules.timerSeconds]);

  const readyRef = useRef(false);
  useEffect(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onReady?.();
  }, [onReady]);

  useEffect(() => {
    if (!timeLeft || status !== "playing") {
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return prev;
        if (prev <= 1) {
          clearInterval(interval);
          setStatus("timeout");
          onTimeout?.();
          Alert.alert("시간 초과", "제한 시간 안에 퍼즐을 완성하지 못했습니다.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onTimeout, timeLeft, status]);

  const selectedPiece = pieces.find(piece => piece.id === selectedPieceId) ?? null;
  const totalCells = puzzle.size * puzzle.size;
  const placedCells = pieces.reduce((sum, piece) => (piece.locked ? sum + piece.cells.length : sum), 0);

  const occupiedMap = useMemo(() => {
    const map = new Map<string, string>();
    pieces.forEach(piece => {
      if (!piece.locked) return;
      projectPieceCells(piece).forEach(cell => {
        map.set(`${cell.row}:${cell.col}`, piece.id);
      });
    });
    return map;
  }, [pieces]);

  const isPlacementValid = useCallback(
    (piece: PieceState | null, originOverride?: { row: number; col: number }) => {
      if (!piece) return false;
      const cells = projectPieceCells(piece, originOverride);
      for (const cell of cells) {
        if (cell.row < 0 || cell.col < 0 || cell.row >= puzzle.size || cell.col >= puzzle.size) {
          return false;
        }
        const occupiedBy = occupiedMap.get(`${cell.row}:${cell.col}`);
        if (occupiedBy && occupiedBy !== piece.id) {
          return false;
        }
      }
      return true;
    },
    [occupiedMap, puzzle.size],
  );

  useEffect(() => {
    if (status !== "playing") return;
    if (placedCells !== totalCells) return;
    if (!pieces.every(piece => piece.locked)) return;
    setStatus("success");
    onComplete?.();
  }, [onComplete, placedCells, pieces, status, totalCells]);

  const updatePiece = useCallback((pieceId: string, updater: (piece: PieceState) => PieceState) => {
    setPieces(prev =>
      prev.map(piece => {
        if (piece.id !== pieceId) return piece;
        return updater(piece);
      }),
    );
  }, []);

  const setPieceOrigin = useCallback(
    (pieceId: string, origin: { row: number; col: number }) => {
      updatePiece(pieceId, piece => ({
        ...piece,
        origin: clampOriginForPiece(piece, origin, puzzle.size),
      }));
    },
    [puzzle.size, updatePiece],
  );

  const movePieceBy = useCallback(
    (pieceId: string, deltaRow: number, deltaCol: number) => {
      const piece = pieces.find(item => item.id === pieceId);
      if (!piece) return;
      setPieceOrigin(pieceId, { row: piece.origin.row + deltaRow, col: piece.origin.col + deltaCol });
    },
    [pieces, setPieceOrigin],
  );

  const rotatePiece = useCallback(
    (direction: "cw" | "ccw") => {
      if (!selectedPiece) return;
      updatePiece(selectedPiece.id, piece => {
        const rotation = direction === "cw" ? (piece.rotation + 1) % 4 : (piece.rotation + 3) % 4;
        const upcoming = { ...piece, rotation };
        const origin = clampOriginForPiece(upcoming, piece.origin, puzzle.size);
        return { ...upcoming, origin };
      });
    },
    [puzzle.size, selectedPiece, updatePiece],
  );

  const flipPiece = useCallback(() => {
    if (!selectedPiece) return;
    updatePiece(selectedPiece.id, piece => {
      const upcoming = { ...piece, flipped: !piece.flipped };
      const origin = clampOriginForPiece(upcoming, piece.origin, puzzle.size);
      return { ...upcoming, origin };
    });
  }, [puzzle.size, selectedPiece, updatePiece]);

  const placeSelectedPiece = useCallback(() => {
    if (!selectedPiece) return;
    if (!isPlacementValid(selectedPiece)) {
      Alert.alert("배치 불가", "조각이 격자 밖으로 나가거나 다른 조각과 겹칩니다.");
      return;
    }
    updatePiece(selectedPiece.id, piece => ({ ...piece, locked: true }));
  }, [isPlacementValid, selectedPiece, updatePiece]);

  const releaseSelectedPiece = useCallback(() => {
    if (!selectedPiece || !selectedPiece.locked) return;
    updatePiece(selectedPiece.id, piece => ({ ...piece, locked: false }));
  }, [selectedPiece, updatePiece]);

  const applyHint = useCallback(() => {
    if (!selectedPiece) return;
    if (rules.hints === 0) return;
    if (hintsLeft === 0) {
      Alert.alert("힌트 없음", "사용 가능한 힌트가 더 이상 없습니다.");
      return;
    }
    setHintsLeft(prev => (prev === null ? prev : Math.max(0, prev - 1)));
    updatePiece(selectedPiece.id, piece => ({
      ...piece,
      rotation: 0,
      flipped: false,
      origin: clampOriginForPiece(
        { ...piece, rotation: 0, flipped: false },
        piece.hintPlacement.origin,
        puzzle.size,
      ),
      locked: true,
    }));
  }, [hintsLeft, puzzle.size, rules.hints, selectedPiece, updatePiece]);

  const resetBoard = useCallback(() => {
    setPieces(initialPieces);
    setSelectedPieceId(initialPieces[0]?.id ?? null);
    setHintsLeft(rules.hints);
    setTimeLeft(rules.timerSeconds);
    setStatus("playing");
  }, [initialPieces, rules.hints, rules.timerSeconds]);

  const handleSnooze = useCallback(() => {
    if (status !== "playing") return;
    setStatus("snoozed");
    onSnooze?.(snoozeMinutes[0]);
  }, [onSnooze, snoozeMinutes, status]);

  const { width } = useWindowDimensions();
  const boardSizePx = Math.min(width - 32, 360);
  const cellSize = boardSizePx / puzzle.size;
  const cellSizeRef = useRef(cellSize);
  cellSizeRef.current = cellSize;

  const selectedPieceRef = useRef<string | null>(selectedPieceId);
  useEffect(() => {
    selectedPieceRef.current = selectedPieceId;
  }, [selectedPieceId]);

  const updateFromPointer = useCallback(
    (x: number, y: number) => {
      if (!selectedPieceRef.current) return;
      if (cellSizeRef.current <= 0) return;
      const row = Math.floor(y / cellSizeRef.current);
      const col = Math.floor(x / cellSizeRef.current);
      if (row < 0 || col < 0) return;
      setPieceOrigin(selectedPieceRef.current, { row, col });
    },
    [setPieceOrigin],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => Boolean(selectedPieceRef.current),
        onMoveShouldSetPanResponder: () => Boolean(selectedPieceRef.current),
        onPanResponderGrant: evt => {
          updateFromPointer(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        },
        onPanResponderMove: evt => {
          updateFromPointer(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        },
      }),
    [updateFromPointer],
  );

  const previewCells = selectedPiece ? projectPieceCells(selectedPiece) : [];
  const previewKeySet = new Set(previewCells.map(cell => `${cell.row}:${cell.col}`));
  const previewValid = isPlacementValid(selectedPiece);

  const formatTime = (value: number | null) => {
    if (value === null) return "--:--";
    const minutes = Math.floor(value / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (value % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>폴리오미노 퍼즐 알람</Text>
      <Text style={styles.subtitle}>
        {puzzle.size} x {puzzle.size} 격자를 모든 조각으로 가득 채워야 알람이 해제됩니다.
      </Text>

      <View style={styles.statusRow}>
        <Text style={styles.statusChip}>난이도: {difficulty.toUpperCase()}</Text>
        <Text style={styles.statusChip}>배치: {pieces.filter(piece => piece.locked).length}/{pieces.length}</Text>
        {rules.timerSeconds ? <Text style={[styles.statusChip, timeLeft !== null && timeLeft <= 30 ? styles.statusChipDanger : null]}>남은 시간: {formatTime(timeLeft)}</Text> : null}
        <Text style={styles.statusChip}>
          힌트: {rules.hints === 0 ? "없음" : hintsLeft === null ? "∞" : hintsLeft}
        </Text>
      </View>

      <View
        style={[styles.board, { width: boardSizePx, height: boardSizePx }]}
        {...panResponder.panHandlers}
      >
        {Array.from({ length: puzzle.size }).map((_, row) => (
          <View key={`row-${row}`} style={styles.boardRow}>
            {Array.from({ length: puzzle.size }).map((__, col) => {
              const key = `${row}:${col}`;
              const lockedBy = occupiedMap.get(key);
              const isPreviewCell = previewKeySet.has(key) && (!lockedBy || lockedBy === selectedPiece?.id);
              const ghostIndex = puzzle.ghostMap[row][col];
              const backgroundColor =
                lockedBy && pieces.find(piece => piece.id === lockedBy)?.color
                  ? pieces.find(piece => piece.id === lockedBy)?.color
                  : rules.showGhost && ghostIndex >= 0
                    ? `${PIECE_COLORS[ghostIndex % PIECE_COLORS.length]}22`
                    : "#1f2937";

              return (
                <Pressable
                  key={key}
                  style={[
                    styles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      backgroundColor,
                      borderColor: isPreviewCell ? (previewValid ? "#22c55e" : "#f43f5e") : "#0f172a",
                    },
                  ]}
                  onPress={() => {
                    if (selectedPiece) {
                      setPieceOrigin(selectedPiece.id, { row, col });
                    }
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.controlRow}>
        <Pressable style={styles.controlButton} onPress={() => movePieceBy(selectedPiece?.id ?? "", -1, 0)} disabled={!selectedPiece || status !== "playing"}>
          <Text style={styles.controlLabel}>↑</Text>
        </Pressable>
        <View style={styles.controlCol}>
          <Pressable style={styles.controlButton} onPress={() => movePieceBy(selectedPiece?.id ?? "", 0, -1)} disabled={!selectedPiece || status !== "playing"}>
            <Text style={styles.controlLabel}>←</Text>
          </Pressable>
          <Pressable style={styles.controlButton} onPress={() => movePieceBy(selectedPiece?.id ?? "", 0, 1)} disabled={!selectedPiece || status !== "playing"}>
            <Text style={styles.controlLabel}>→</Text>
          </Pressable>
        </View>
        <Pressable style={styles.controlButton} onPress={() => movePieceBy(selectedPiece?.id ?? "", 1, 0)} disabled={!selectedPiece || status !== "playing"}>
          <Text style={styles.controlLabel}>↓</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={[styles.actionButton, styles.secondaryButton]} onPress={() => rotatePiece("ccw")} disabled={!selectedPiece || status !== "playing"}>
          <Text style={styles.actionLabel}>↺ 회전</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.secondaryButton]} onPress={() => rotatePiece("cw")} disabled={!selectedPiece || status !== "playing"}>
          <Text style={styles.actionLabel}>↻ 회전</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.secondaryButton]} onPress={flipPiece} disabled={!selectedPiece || status !== "playing"}>
          <Text style={styles.actionLabel}>대칭</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.secondaryButton]} onPress={applyHint} disabled={!selectedPiece || status !== "playing" || rules.hints === 0}>
          <Text style={styles.actionLabel}>힌트</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.actionButton, previewValid ? styles.primaryButton : styles.disabledButton]}
          onPress={placeSelectedPiece}
          disabled={!selectedPiece || !previewValid || selectedPiece.locked || status !== "playing"}
        >
          <Text style={styles.actionLabel}>배치하기</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, selectedPiece?.locked ? styles.warningButton : styles.disabledButton]}
          onPress={releaseSelectedPiece}
          disabled={!selectedPiece || !selectedPiece.locked || status !== "playing"}
        >
          <Text style={styles.actionLabel}>해제</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.secondaryButton]} onPress={resetBoard}>
          <Text style={styles.actionLabel}>초기화</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pieceTray}>
        {pieces.map(piece => {
          const oriented = transformPolyomino(piece.cells, piece.rotation, piece.flipped);
          const { width: pieceWidth, height: pieceHeight } = getPolyominoBounds(oriented);
          const scale = 24;
          const isSelected = piece.id === selectedPieceId;
          return (
            <Pressable
              key={piece.id}
              style={[
                styles.pieceCard,
                { borderColor: isSelected ? "#38bdf8" : "#1e293b" },
                piece.locked ? styles.pieceCardLocked : null,
              ]}
              onPress={() => {
                setSelectedPieceId(piece.id);
              }}
            >
              <Text style={styles.pieceLabel}>
                {piece.shapeId} · {piece.kind === "tetromino" ? "4칸" : "5칸"}
              </Text>
              <View style={{ width: pieceWidth * scale, height: pieceHeight * scale }}>
                {oriented.map(cell => (
                  <View
                    key={`${piece.id}-${cell.row}-${cell.col}`}
                    style={{
                      position: "absolute",
                      width: scale - 4,
                      height: scale - 4,
                      backgroundColor: piece.color,
                      borderRadius: 6,
                      left: cell.col * scale,
                      top: cell.row * scale,
                    }}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={[styles.footerButton, styles.secondaryButton]} onPress={handleSnooze}>
          <Text style={styles.footerLabel}>5분만 더</Text>
        </Pressable>
        {status === "timeout" ? (
          <Pressable style={[styles.footerButton, styles.warningButton]} onPress={resetBoard}>
            <Text style={styles.footerLabel}>다시 도전</Text>
          </Pressable>
        ) : null}
      </View>

      {status === "success" ? <Text style={styles.successBanner}>퍼즐 완료! 알람을 해제했어요.</Text> : null}
      {status === "timeout" ? <Text style={styles.timeoutBanner}>시간 초과! 다시 시도하거나 스누즈하세요.</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#e2e8f0",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    textAlign: "center",
    color: "#94a3b8",
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1d4ed8",
    color: "#bfdbfe",
    fontSize: 13,
  },
  statusChipDanger: {
    borderColor: "#f87171",
    color: "#fecaca",
  },
  board: {
    marginTop: 20,
    alignSelf: "center",
    backgroundColor: "#1f2937",
    borderRadius: 16,
    padding: 4,
  },
  boardRow: {
    flexDirection: "row",
  },
  cell: {
    borderWidth: 1,
    margin: 1,
    borderRadius: 6,
  },
  controlRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    gap: 12,
  },
  controlCol: {
    flexDirection: "row",
    gap: 12,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  controlLabel: {
    color: "#e2e8f0",
    fontSize: 20,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 96,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#0ea5e9",
  },
  secondaryButton: {
    backgroundColor: "#1e293b",
  },
  warningButton: {
    backgroundColor: "#f97316",
  },
  disabledButton: {
    backgroundColor: "#475569",
  },
  actionLabel: {
    color: "#f8fafc",
    fontWeight: "600",
  },
  pieceTray: {
    marginTop: 20,
    paddingBottom: 20,
    gap: 12,
  },
  pieceCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    marginRight: 12,
    backgroundColor: "#111827",
  },
  pieceCardLocked: {
    opacity: 0.5,
  },
  pieceLabel: {
    color: "#e5e7eb",
    fontWeight: "600",
    marginBottom: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 12,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  footerLabel: {
    color: "#f8fafc",
    fontWeight: "700",
  },
  successBanner: {
    textAlign: "center",
    marginTop: 12,
    color: "#4ade80",
    fontWeight: "700",
  },
  timeoutBanner: {
    textAlign: "center",
    marginTop: 12,
    color: "#f87171",
    fontWeight: "700",
  },
});

export default PuzzleChallenge;
