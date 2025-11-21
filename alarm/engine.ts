import { NativeEventEmitter, NativeModules, Platform } from "react-native";

import {
  AlarmEvent,
  AlarmSpec,
  EngineCommand,
  parseAlarmEvent,
  serializeAlarmSpec,
  serializeEngineCommand,
} from "./contracts";

type NativeAlarmModule = {
  scheduleExact(specJson: string): Promise<void>;
  cancel(alarmId: string): Promise<void>;
  send(commandJson: string): Promise<void>;
};

const MODULE_NAME = "AlarmEngine";
const EVENT_NAME = "AlarmEvent";

const nativeModule = NativeModules[MODULE_NAME] as NativeAlarmModule | undefined;

if (Platform.OS === "android" && !nativeModule) {
  console.warn("[AlarmEngine] Native module not found. Did you install the Android package?");
}

const eventEmitter = nativeModule ? new NativeEventEmitter(nativeModule as any) : null;

export type AlarmEventListener = (event: AlarmEvent) => void;

const listeners = new Set<AlarmEventListener>();
let subscription: { remove(): void } | null = null;

const ensureSubscription = () => {
  if (subscription || Platform.OS !== "android" || !nativeModule || !eventEmitter) {
    return;
  }

  subscription = eventEmitter.addListener(EVENT_NAME, payload => {
    if (typeof payload !== "string") {
      console.warn("[AlarmEngine] Expected string payload, got", payload);
      return;
    }

    try {
      const event = parseAlarmEvent(payload);
      listeners.forEach(listener => listener(event));
    } catch (error) {
      console.warn("[AlarmEngine] Failed to parse event", error);
    }
  });
};

const teardownSubscription = () => {
  if (listeners.size === 0 && subscription) {
    subscription.remove();
    subscription = null;
  }
};

const guardNative = (): NativeAlarmModule => {
  if (!nativeModule) {
    throw new Error("AlarmEngine native module unavailable on this platform");
  }
  return nativeModule;
};

export const AlarmEngine = {
  async scheduleExact(spec: AlarmSpec): Promise<void> {
    const module = guardNative();
    await module.scheduleExact(serializeAlarmSpec(spec));
  },

  async cancel(alarmId: string): Promise<void> {
    const module = guardNative();
    await module.cancel(alarmId);
  },

  async send(command: EngineCommand): Promise<void> {
    const module = guardNative();
    await module.send(serializeEngineCommand(command));
  },

  addListener(listener: AlarmEventListener): () => void {
    ensureSubscription();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      teardownSubscription();
    };
  },

  removeAllListeners(): void {
    listeners.clear();
    teardownSubscription();
  },
};
