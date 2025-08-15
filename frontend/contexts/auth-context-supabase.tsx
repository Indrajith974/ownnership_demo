'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase, trackEvent, subscribeToUserData } from '@/utils/supabase/client';
import { Database } from '@/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface User extends Profile {
  email?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  walletAddress: string | null;
  isWalletConnected: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username?: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  connectWallet: (address: string) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [realtimeSubscription, setRealtimeSubscription] = useState<any>(null);

  // Initialize auth state and set up real-time subscriptions
  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
          setIsLoading(false);
          return;
        }
        
        setSession(session);
        if (session?.user) {
          await loadUserProfile(session.user.id);
          setupRealtimeSubscription(session.user.id);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      setSession(session);
      
      if (session?.user) {
        await loadUserProfile(session.user.id);
        setupRealtimeSubscription(session.user.id);
        
        // Track login event
        await trackEvent('user_login', { 
          method: 'email',
          timestamp: new Date().toISOString() 
        }, session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        if (realtimeSubscription) {
          realtimeSubscription.unsubscribe();
          setRealtimeSubscription(null);
        }
      }
      
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
      }
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create one
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const newProfile = {
            id: userId,
            username: userData.user.email?.split('@')[0] || null,
            full_name: userData.user.user_metadata?.full_name || null,
            avatar_url: userData.user.user_metadata?.avatar_url || null,
            bio: null,
            website: null,
            twitter_handle: null,
            github_handle: null,
            wallet_address: null,
          };

          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .single();

          if (!createError && createdProfile) {
            setProfile(createdProfile);
            setUser({ ...createdProfile, email: userData.user.email });
          }
        }
      } else if (!error && profileData) {
        setProfile(profileData);
        const { data: userData } = await supabase.auth.getUser();
        setUser({ ...profileData, email: userData.user?.email });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const setupRealtimeSubscription = (userId: string) => {
    if (realtimeSubscription) {
      realtimeSubscription.unsubscribe();
    }

    const subscription = subscribeToUserData(userId, (payload) => {
      console.log('Real-time profile update:', payload);
      if (payload.new) {
        setProfile(payload.new);
        setUser(prev => prev ? { ...prev, ...payload.new } : null);
      }
    });

    setRealtimeSubscription(subscription);
  };

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Track successful login
      if (data.user) {
        await trackEvent('user_login_success', { 
          method: 'email',
          timestamp: new Date().toISOString() 
        }, data.user.id);
      }
    } catch (error: any) {
      // Track failed login
      await trackEvent('user_login_failed', { 
        method: 'email',
        error: error.message,
        timestamp: new Date().toISOString() 
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, username?: string, fullName?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || email.split('@')[0],
            full_name: fullName || null,
          }
        }
      });

      if (error) throw error;

      // Track successful registration
      if (data.user) {
        await trackEvent('user_register_success', { 
          method: 'email',
          timestamp: new Date().toISOString() 
        }, data.user.id);
      }
    } catch (error: any) {
      // Track failed registration
      await trackEvent('user_register_failed', { 
        method: 'email',
        error: error.message,
        timestamp: new Date().toISOString() 
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Track logout event
      if (session?.user) {
        await trackEvent('user_logout', { 
          timestamp: new Date().toISOString() 
        }, session.user.id);
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }, [session]);

  const connectWallet = useCallback(async (address: string) => {
    if (!session?.user || !profile) {
      throw new Error('Must be logged in to connect wallet');
    }
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ wallet_address: address })
        .eq('id', session.user.id);

      if (error) throw error;

      // Track wallet connection
      await trackEvent('wallet_connected', { 
        wallet_address: address,
        timestamp: new Date().toISOString() 
      }, session.user.id);

      // Profile will be updated via real-time subscription
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }, [session, profile]);

  const disconnectWallet = useCallback(async () => {
    if (!session?.user || !profile) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ wallet_address: null })
        .eq('id', session.user.id);

      if (error) throw error;

      // Track wallet disconnection
      await trackEvent('wallet_disconnected', { 
        timestamp: new Date().toISOString() 
      }, session.user.id);

      // Profile will be updated via real-time subscription
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  }, [session, profile]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!session?.user) {
      throw new Error('Must be logged in to update profile');
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', session.user.id);

      if (error) throw error;

      // Track profile update
      await trackEvent('profile_updated', { 
        fields_updated: Object.keys(updates),
        timestamp: new Date().toISOString() 
      }, session.user.id);

      // Profile will be updated via real-time subscription
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }, [session]);

  const isAuthenticated = useMemo(() => !!session && !!user, [session, user]);
  const walletAddress = useMemo(() => profile?.wallet_address || null, [profile]);
  const isWalletConnected = useMemo(() => !!walletAddress, [walletAddress]);

  const contextValue = useMemo(() => ({
    user,
    session,
    profile,
    isAuthenticated,
    isLoading,
    walletAddress,
    isWalletConnected,
    login,
    register,
    logout,
    connectWallet,
    disconnectWallet,
    updateProfile,
  }), [
    user,
    session,
    profile,
    isAuthenticated,
    isLoading,
    walletAddress,
    isWalletConnected,
    login,
    register,
    logout,
    connectWallet,
    disconnectWallet,
    updateProfile,
  ]);

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
