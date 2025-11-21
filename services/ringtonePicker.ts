import { NativeModules } from "react-native";

const module = NativeModules.RingtonePicker as
  | {
      pickAlarmTone: (currentValue?: string | null) => Promise<string | null>;
    }
  | undefined;

export const pickAlarmTone = async (currentValue?: string): Promise<string | null> => {
  if (!module || typeof module.pickAlarmTone !== "function") {
    console.warn("[RingtonePicker] Native module unavailable");
    return null;
  }

  try {
    const result = await module.pickAlarmTone(currentValue ?? null);
    return typeof result === "string" ? result : null;
  } catch (error) {
    console.warn("[RingtonePicker] pick failed", error);
    return null;
  }
};
