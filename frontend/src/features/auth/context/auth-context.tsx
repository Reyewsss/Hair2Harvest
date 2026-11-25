import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { clearApiCache, setUnauthorizedHandler } from "@/lib/api";
import { authApi, type AuthUser } from "../auth-api";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean; // true while the saved session is being checked on page load
  /** Resolves with { otpRequired: true } for admin and staff; otherwise the user is signed in. */
  login: (
    email: string,
    password: string,
    rememberMe: boolean,
  ) => Promise<{ otpRequired: boolean; email: string }>;
  verifyLoginOtp: (
    email: string,
    code: string,
    rememberMe: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
  /** Replace the signed-in user after a profile edit, so the sidebar etc. update. */
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session from the cookie.
  useEffect(() => {
    authApi
      .me()
      .then((result) => setUser(result.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // If any later request comes back 401, the session has ended.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearApiCache();
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback<AuthContextValue["login"]>(
    async (email, password, rememberMe) => {
      clearApiCache();
      const result = await authApi.login(email, password, rememberMe);
      if ("user" in result) {
        setUser(result.user);
        return { otpRequired: false, email };
      }
      return { otpRequired: true, email: result.email };
    },
    [],
  );

  const verifyLoginOtp = useCallback<AuthContextValue["verifyLoginOtp"]>(
    async (email, code, rememberMe) => {
      clearApiCache();
      const result = await authApi.verifyLoginOtp(email, code, rememberMe);
      setUser(result.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
      toast.success("You have been signed out.");
    } finally {
      clearApiCache();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, verifyLoginOtp, logout, updateUser: setUser }),
    [user, loading, login, verifyLoginOtp, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
