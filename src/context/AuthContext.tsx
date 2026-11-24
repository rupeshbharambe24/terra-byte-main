import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import i18n, { isAppLanguage } from '@/i18n';
import { authApi, tokenStore, UNAUTHORIZED_EVENT } from '@/lib/api';
import type { Language, MeUpdate, RegisterPayload, RegisterResponse, User } from '@/lib/types';

export type { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  /** True while the stored session is being restored on page load. */
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  register: (data: RegisterPayload) => Promise<RegisterResponse>;
  logout: () => void;
  updateProfile: (data: MeUpdate) => Promise<User>;
  setLanguage: (lng: Language) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

function applyUserLanguage(user: User) {
  if (isAppLanguage(user.preferred_language) && i18n.resolvedLanguage !== user.preferred_language) {
    void i18n.changeLanguage(user.preferred_language);
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => tokenStore.get() !== null);

  // Restore the session from the stored token.
  useEffect(() => {
    if (!tokenStore.get()) return;
    const controller = new AbortController();
    authApi
      .me(controller.signal)
      .then((me) => {
        setUser(me);
        applyUserLanguage(me);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        tokenStore.clear();
        setUser(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  // Any 401 from the API (expired token) signs the user out.
  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      queryClient.clear();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [queryClient]);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await authApi.login(identifier.trim(), password);
    tokenStore.set(res.access_token);
    setUser(res.user);
    applyUserLanguage(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (data: RegisterPayload) => {
    const res = await authApi.register(data);
    if (res.access_token) {
      tokenStore.set(res.access_token);
      setUser(res.user);
    }
    return res;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const updateProfile = useCallback(async (data: MeUpdate) => {
    const updated = await authApi.updateMe(data);
    setUser(updated);
    return updated;
  }, []);

  const setLanguage = useCallback(
    async (lng: Language) => {
      await i18n.changeLanguage(lng);
      if (user && user.preferred_language !== lng) {
        try {
          setUser(await authApi.updateMe({ preferred_language: lng }));
        } catch {
          /* the UI language already changed; saving the preference can be retried later */
        }
      }
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      register,
      logout,
      updateProfile,
      setLanguage,
    }),
    [user, isLoading, login, register, logout, updateProfile, setLanguage]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
