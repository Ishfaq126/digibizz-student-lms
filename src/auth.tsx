import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loginStudent, setAuthToken } from "./api";
import { AuthUser, StudentContext } from "./types";

type AuthState = {
  loading: boolean;
  token: string | null;
  user: AuthUser | null;
  studentCtx: StudentContext | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const TOKEN_KEY = "digibizz_student_token";
const USER_KEY = "digibizz_student_user";

function mapStudentCtx(user: AuthUser): StudentContext {
  return {
    user_id: user.id,
    tb_id: Number(user.tb_id ?? 8),
    center_id: Number(user.center_id ?? 1),
    course_id: Number(user.course_id ?? 1),
    user_type: "student",
    std_rollno: user.std_rollno,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    (async () => {
      const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const savedUser = await AsyncStorage.getItem(USER_KEY);
      if (savedToken && savedUser) {
        const parsed = JSON.parse(savedUser) as AuthUser;
        setToken(savedToken);
        setUser(parsed);
        setAuthToken(savedToken);
      }
      setLoading(false);
    })();
  }, []);

  const signIn = async (username: string, password: string) => {
    const data = await loginStudent(username, password);
    const resolvedToken = data.token;
    if (!resolvedToken) throw new Error("Token not returned from server.");
    const mappedUser: AuthUser = data.user;
    if (!mappedUser?.id) throw new Error("User profile not returned from server.");
    setToken(resolvedToken);
    setUser(mappedUser);
    setAuthToken(resolvedToken);
    await AsyncStorage.setItem(TOKEN_KEY, resolvedToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(mappedUser));
  };

  const signOut = async () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  };

  const value = useMemo(
    () => ({
      loading,
      token,
      user,
      studentCtx: user ? mapStudentCtx(user) : null,
      signIn,
      signOut,
    }),
    [loading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider.");
  return ctx;
}
