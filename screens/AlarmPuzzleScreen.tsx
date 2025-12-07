import React, { useCallback, useEffect } from "react";
import { RouteProp, useNavigation } from "@react-navigation/native";

import PuzzleChallenge from "../Components/Challenge/PuzzleChallenge";
import { AlarmEngine } from "../alarm/engine";
import type { RootStackParamList } from "../types/navigation.types";

type AlarmPuzzleRoute = RouteProp<RootStackParamList, "AlarmPuzzle">;

const AlarmPuzzleScreen: React.FC<{ route: AlarmPuzzleRoute }> = ({ route }) => {
  const navigation = useNavigation();
  const { alarmId, size, difficulty, seed } = route.params;

  useEffect(() => {
    let mounted = true;
    AlarmEngine.send({ type: "UI_READY", id: alarmId, timestampUtc: Date.now() }).catch(console.error);
    const unsubscribe = AlarmEngine.addListener(event => {
      if (!mounted) return;
      if (event.id !== alarmId) return;
      if (event.type === "DISMISSED") {
        navigation.goBack();
      }
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [alarmId, navigation]);

  const handleComplete = useCallback(() => {
    AlarmEngine.send({ type: "DISMISS", id: alarmId }).catch(console.error);
  }, [alarmId]);

  const handleSnooze = useCallback(
    (minutes?: number) => {
      AlarmEngine.send({ type: "SNOOZE", id: alarmId, minutes }).catch(console.error);
    },
    [alarmId],
  );

  return (
    <PuzzleChallenge
      size={size}
      difficulty={difficulty}
      seed={seed}
      snoozeMinutes={[5]}
      onComplete={handleComplete}
      onSnooze={handleSnooze}
    />
  );
};

export default AlarmPuzzleScreen;
