import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types/index.js';
import { ApiClient } from '../api/client.js';

interface AuthContextType {
  user: User | null;
  permissions: string[];
  isAdmin: boolean;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  login: (email: string, password?: string) => Promise<void>;
  switchRole: (roleName: string) => Promise<void>;
  logout: () => void;
  availableUsers: any[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  const loadUser = async () => {
    try {
      const data = await ApiClient.getMe();
      setUser(data.user);
      setPermissions(data.permissions);
    } catch (err) {
      // Auto login as Super Admin default if not logged in
      try {
        const loginData = await ApiClient.login({
          email: 'admin@builderops.com',
          password: 'Admin@123',
        });
        ApiClient.setToken(loginData.token);
        setUser(loginData.user);
        setPermissions(loginData.permissions);
      } catch (e) {
        ApiClient.clearToken();
        setUser(null);
        setPermissions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const users = await ApiClient.getUsers();
      setAvailableUsers(users);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    loadUser().then(loadAvailableUsers);
  }, []);

  const login = async (email: string, password = 'Admin@123') => {
    setLoading(true);
    try {
      const data = await ApiClient.login({ email, password });
      ApiClient.setToken(data.token);
      setUser(data.user);
      setPermissions(data.permissions);
    } finally {
      setLoading(false);
    }
  };

  const switchRole = async (roleName: string) => {
    const targetUser = availableUsers.find(u => u.role === roleName);
    if (targetUser) {
      await login(targetUser.email, 'Admin@123');
    }
  };

  const logout = () => {
    ApiClient.clearToken();
    setUser(null);
    setPermissions([]);
  };

  const hasPermission = (perm: string): boolean => {
    if (permissions.includes('*')) return true;
    return permissions.includes(perm);
  };

  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Builder Admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isAdmin,
        loading,
        hasPermission,
        login,
        switchRole,
        logout,
        availableUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
