import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

export type AuthZyonUser = {
  id: number;
  username: string;
  role: "admin" | "user";
  avatarUrl: string | null;
  keyLimit: number;
  keysGenerated: number;
};

type AuthZyonContextType = {
  user: AuthZyonUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => void;
};

const AuthZyonContext = createContext<AuthZyonContextType | null>(null);

export function AuthZyonProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthZyonUser | null>(null);
  const [loading, setLoading] = useState(true);

  const meQuery = trpc.customAuth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const loginMutation = trpc.customAuth.login.useMutation();
  const logoutMutation = trpc.customAuth.logout.useMutation();

  useEffect(() => {
    if (!meQuery.isLoading) {
      setUser(meQuery.data as AuthZyonUser | null);
      setLoading(false);
    }
  }, [meQuery.data, meQuery.isLoading]);

  const login = useCallback(async (username: string, password: string) => {
    const result = await loginMutation.mutateAsync({ username, password });
    setUser(result.user as AuthZyonUser);
    await meQuery.refetch();
  }, [loginMutation, meQuery]);

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
    setUser(null);
  }, [logoutMutation]);

  const refetch = useCallback(() => {
    meQuery.refetch();
  }, [meQuery]);

  return (
    <AuthZyonContext.Provider value={{ user, loading, login, logout, refetch }}>
      {children}
    </AuthZyonContext.Provider>
  );
}

export function useAuthZyon() {
  const ctx = useContext(AuthZyonContext);
  if (!ctx) throw new Error("useAuthZyon must be used inside AuthZyonProvider");
  return ctx;
}
