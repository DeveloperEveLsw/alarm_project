import { NativeModules } from "react-native";
import type { SupportedStorage } from "@supabase/supabase-js";

type NativeModuleShape = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string | null) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const fallbackStore: Record<string, string> = {};

const fallbackModule: NativeModuleShape = {
  async getItem(key: string) {
    return Object.prototype.hasOwnProperty.call(fallbackStore, key) ? fallbackStore[key] : null;
  },
  async setItem(key: string, value: string | null) {
    if (value == null) {
      delete fallbackStore[key];
    } else {
      fallbackStore[key] = value;
    }
  },
  async removeItem(key: string) {
    delete fallbackStore[key];
  },
};

const nativeModule = (NativeModules.SupabaseStorage as NativeModuleShape | undefined) ?? fallbackModule;

if (!NativeModules.SupabaseStorage) {
  console.warn("[SupabaseStorage] Native module not linked. Falling back to in-memory storage.");
}

export const supabaseStorageAdapter: SupportedStorage = {
  getItem: nativeModule.getItem,
  setItem: (key, value) => nativeModule.setItem(key, typeof value === "string" ? value : String(value)),
  removeItem: nativeModule.removeItem,
};
