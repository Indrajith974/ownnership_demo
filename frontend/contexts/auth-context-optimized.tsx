'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
  wallet_address?: string;
  wallet_connected?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  walletAddress: string | null;
  isWalletConnected: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username?: string, fullName?: string) => Promise<void>;
  logout: () => void;
  connectWallet: (address: string) => Promise<void>;
  disconnectWallet: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Initialize auth state from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();
      
      setToken(data.access_token);
      setUser(data.user);
      
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
    } finally {
      setIsLoading(false);
    }
  }, [API_URL]);

  const register = useCallback(async (email: string, password: string, username?: string, fullName?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          username: username || undefined,
          full_name: fullName || undefined
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }

      const data = await response.json();
      
      setToken(data.access_token);
      setUser(data.user);
      
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
    } finally {
      setIsLoading(false);
    }
  }, [API_URL]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setWalletAddress(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('wallet_address');
  }, []);

  const isAuthenticated = useMemo(() => !!user && !!token, [user, token]);

  const connectWallet = useCallback(async (address: string) => {
    if (!isAuthenticated) {
      throw new Error('Must be logged in to connect wallet');
    }
    
    try {
      // Update user profile with wallet address
      const response = await fetch(`${API_URL}/api/auth/connect-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ wallet_address: address })
      });

      if (response.ok) {
        setWalletAddress(address);
        setUser(prev => prev ? { ...prev, wallet_address: address, wallet_connected: true } : null);
        localStorage.setItem('wallet_address', address);
      }
    } catch (error) {
      console.error('Error connecting wallet to backend:', error);
      // Still set locally even if backend fails
      setWalletAddress(address);
      localStorage.setItem('wallet_address', address);
    }
  }, [isAuthenticated, token, API_URL]);

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
    setUser(prev => prev ? { ...prev, wallet_address: undefined, wallet_connected: false } : null);
    localStorage.removeItem('wallet_address');
  }, []);

  const isWalletConnected = useMemo(() => !!walletAddress, [walletAddress]);

  const contextValue = useMemo(() => ({
    user,
    token,
    isAuthenticated,
    isLoading,
    walletAddress,
    isWalletConnected,
    login,
    register,
    logout,
    connectWallet,
    disconnectWallet
  }), [user, token, isAuthenticated, isLoading, walletAddress, isWalletConnected, login, register, logout, connectWallet, disconnectWallet]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
