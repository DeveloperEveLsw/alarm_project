declare module "react-native-config" {
  interface EnvConfig {
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
    SUPABASE_REDIRECT_URL?: string;
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_SUPABASE_REDIRECT_URL?: string;
  }

  const Config: EnvConfig;
  export default Config;
}
