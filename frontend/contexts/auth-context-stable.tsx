'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// Simple, fast, stable auth context without Supabase complexity
interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  wallet_address?: string;
}

interface AuthContextType {
  user: User | null;
  profile: User | null;
  session: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, userData?: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  connectWallet: (address: string) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client initialized for sync');
  } catch (error) {
    console.warn('⚠️ Supabase client initialization failed:', error);
  }
} else {
  console.warn('⚠️ Supabase credentials not found. Data will only be stored locally.');
}

// Helper function to sync user to Supabase
const syncUserToSupabase = async (userData: User) => {
  if (!supabase) return;
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userData.id,
        email: userData.email,
        username: userData.username,
        full_name: userData.full_name,
        wallet_address: userData.wallet_address,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.warn('Supabase sync warning:', error);
    } else {
      console.log('✅ User synced to Supabase');
    }
  } catch (error) {
    console.warn('Supabase sync error:', error);
  }
};

// Helper function to track events in Supabase
const trackEventInSupabase = async (userId: string, eventType: string, eventData: any = {}) => {
  if (!supabase) return;
  
  try {
    await supabase
      .from('analytics_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
        created_at: new Date().toISOString()
      });
    
    console.log(`✅ Event tracked: ${eventType}`);
  } catch (error) {
    console.warn('Event tracking error:', error);
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('auth_user');
      const savedToken = localStorage.getItem('auth_token');
      
      if (savedUser && savedToken) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error('Error loading saved auth:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const userData = data.user;
        
        setUser(userData);
        localStorage.setItem('auth_user', JSON.stringify(userData));
        localStorage.setItem('auth_token', data.access_token);
        
        // Sync to Supabase
        await syncUserToSupabase(userData);
        await trackEventInSupabase(userData.id, 'user_login', { email: userData.email });
        
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, userData: any = {}) => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          username: userData.username,
          full_name: userData.full_name,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newUser = data.user;
        
        setUser(newUser);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
        localStorage.setItem('auth_token', data.access_token);
        
        // Sync to Supabase
        await syncUserToSupabase(newUser);
        await trackEventInSupabase(newUser.id, 'user_registered', { 
          email: newUser.email, 
          username: newUser.username 
        });
        
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('wallet_address');
  }, []);

  const connectWallet = useCallback(async (address: string) => {
    if (!user) return;
    
    try {
      const updatedUser = { ...user, wallet_address: address };
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      localStorage.setItem('wallet_address', address);
      
      // Sync to Supabase
      await syncUserToSupabase(updatedUser);
      await trackEventInSupabase(user.id, 'wallet_connected', { wallet_address: address });
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  }, [user]);

  const disconnectWallet = useCallback(async () => {
    if (!user) return;
    
    try {
      const updatedUser = { ...user, wallet_address: undefined };
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      localStorage.removeItem('wallet_address');
      
      // Sync to Supabase
      await syncUserToSupabase(updatedUser);
      await trackEventInSupabase(user.id, 'wallet_disconnected', {});
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  }, [user]);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!user) return;
    
    try {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  }, [user]);

  const value = {
    user,
    profile: user, // For compatibility
    session: user ? { user } : null, // For compatibility
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    connectWallet,
    disconnectWallet,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
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
