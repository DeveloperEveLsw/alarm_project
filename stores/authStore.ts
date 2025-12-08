import { AppState, Linking, Platform } from "react-native";
import { create } from "zustand";
import { getSupabaseRedirectUrl, supabase } from "../services/supabaseClient";

type SupabaseSession = NonNullable<Awaited<ReturnType<NonNullable<typeof supabase>["auth"]["getSession"]>>["data"]["session"]>;
type SupabaseUser = SupabaseSession["user"];

type AuthState = {
  user: SupabaseUser | null;
  session: SupabaseSession | null;
  isInitialized: boolean;
  isLoggingIn: boolean;
  initialize: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

let authListener: { unsubscribe: () => void } | null = null;
let deepLinkListener: { remove: () => void } | null = null;
let appStateListener: { remove: () => void } | null = null;
let autoRefreshInitialized = false;

const startAuthListener = (set: (partial: Partial<AuthState>) => void) => {
  if (authListener || !supabase) return;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    set({ session: session ?? null, user: session?.user ?? null });
  });
  authListener = data.subscription;
};

const parseParams = (raw: string | null | undefined): Record<string, string> => {
  if (!raw) return {};
  const trimmed = raw.startsWith("#") || raw.startsWith("?") ? raw.slice(1) : raw;
  if (!trimmed) return {};
  return trimmed.split("&").reduce<Record<string, string>>((acc, chunk) => {
    const [key, value] = chunk.split("=");
    if (!key) {
      return acc;
    }
    const decodedKey = decodeURIComponent(key);
    const decodedValue = value ? decodeURIComponent(value) : "";
    acc[decodedKey] = decodedValue;
    return acc;
  }, {});
};

const handleOAuthRedirect = async (url: string) => {
  if (!supabase) return;
  const redirectBase = getSupabaseRedirectUrl();
  if (!redirectBase) {
    console.warn("[Auth] redirect URL이 설정되지 않아 OAuth 응답을 처리할 수 없습니다.");
    return;
  }

  const normalize = (value: string): string => {
    const trimmed = value.trim();
    const withoutScheme = trimmed.replace(/:\/?\/?/, "://").replace(/\\\/+/g, "/");
    const withoutTrailingSlash = withoutScheme.endsWith("/")
      ? withoutScheme.slice(0, -1)
      : withoutScheme;
    return withoutTrailingSlash.toLowerCase();
  };

  if (!url || !normalize(url).startsWith(normalize(redirectBase))) {
    return;
  }

  const [withoutHash, hashPart] = url.split("#", 2);
  const [, searchPart] = withoutHash.split("?", 2);
  const queryParams = parseParams(searchPart);
  const hashParams = parseParams(hashPart);
  const mergedParams = { ...queryParams, ...hashParams };

  const handleResult = (error?: Error | null) => {
    if (error) {
      console.warn("[Auth] OAuth 세션 갱신 실패", error);
    }
  };

  if (mergedParams.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(mergedParams.code);
    handleResult(error);
    return;
  }

  const accessToken = mergedParams.access_token;
  const refreshToken = mergedParams.refresh_token;
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    handleResult(error);
  }
};

const startDeepLinkListener = () => {
  if (deepLinkListener || !supabase) return;
  const handler = (event: { url: string }) => {
    handleOAuthRedirect(event.url).catch(error => {
      console.warn("[Auth] OAuth 리디렉션 처리 중 오류 발생", error);
    });
  };
  deepLinkListener = Linking.addEventListener("url", handler);
  Linking.getInitialURL()
    .then(initialUrl => {
      if (initialUrl) {
        return handleOAuthRedirect(initialUrl);
      }
    })
    .catch(error => {
      console.warn("[Auth] 초기 URL을 가져오는 데 실패했습니다.", error);
    });
};

const startAutoRefreshHandler = () => {
  if (!supabase || autoRefreshInitialized) return;
  autoRefreshInitialized = true;
  supabase.auth.startAutoRefresh();
  const handleChange = (state: string) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  };
  appStateListener = AppState.addEventListener("change", handleChange);
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isInitialized: false,
  isLoggingIn: false,
  initialize: async () => {
    if (get().isInitialized) return;
    if (!supabase) {
      console.warn("[Auth] Supabase 미설정 상태입니다. 로그인 기능이 비활성화됩니다.");
      set({ isInitialized: true });
      return;
    }
    startAuthListener(partial => set(partial as AuthState));
    startDeepLinkListener();
    startAutoRefreshHandler();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    set({ user: session?.user ?? null, session: session ?? null, isInitialized: true });
  },
  loginWithGoogle: async () => {
    if (get().isLoggingIn) return;
    if (!supabase) {
      console.warn("[Auth] Supabase 설정이 없어 로그인할 수 없습니다.");
      return;
    }
    set({ isLoggingIn: true });
    try {
      const redirectTo = getSupabaseRedirectUrl();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS === "web",
        },
      });
      if (error) {
        throw error;
      }
      if (data?.url && Platform.OS !== "web") {
        await Linking.openURL(data.url);
      }
    } finally {
      set({ isLoggingIn: false });
    }
  },
  logout: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));
