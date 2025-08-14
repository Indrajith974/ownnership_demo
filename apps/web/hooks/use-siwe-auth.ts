'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { SiweMessage } from 'siwe';
import { createClient } from '@/utils/supabase/client';

interface SiweAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  profile: UserProfile | null;
}

interface UserProfile {
  id: string;
  address: string;
  handle: string | null;
  bio: string;
  avatar: string;
  socials: {
    twitter: string;
    github: string;
    website: string;
    discord: string;
  };
  contentTypes: string[];
  isVerified: boolean;
  reputation: number;
  credits: number;
  createdAt: string;
  updatedAt: string;
}

export function useSiweAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const [authState, setAuthState] = useState<SiweAuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    profile: null,
  });

  const supabase = createClient();

  // Check if user is already authenticated
  useEffect(() => {
    if (isConnected && address) {
      checkAuthStatus();
    } else {
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        profile: null,
      }));
    }
  }, [isConnected, address]);

  const checkAuthStatus = async () => {
    if (!address) return;

    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Check if user exists and is authenticated
      const { data: session } = await supabase.auth.getSession();
      if (session?.session) {
        // Fetch user profile
        const profile = await fetchUserProfile(address);
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          profile,
        });
      } else {
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: false,
          isLoading: false,
          profile: null,
        }));
      }
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication check failed',
        profile: null,
      });
    }
  };

  const signIn = async () => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      // Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to The Ownership Layer to verify your identity and claim ownership of your content.',
        uri: window.location.origin,
        version: '1',
        chainId: 1, // Ethereum mainnet
        nonce: await generateNonce(),
      });

      const messageBody = message.prepareMessage();

      // Sign the message
      const signature = await signMessageAsync({
        message: messageBody,
      });

      // Verify signature and authenticate with backend
      const authResponse = await fetch('/api/auth/siwe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageBody,
          signature,
          address,
        }),
      });

      if (!authResponse.ok) {
        throw new Error('Authentication failed');
      }

      const { user, session } = await authResponse.json();

      // Set Supabase session
      await supabase.auth.setSession(session);

      // Fetch or create user profile
      let profile = await fetchUserProfile(address);
      if (!profile) {
        profile = await createUserProfile(address);
      }

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        profile,
      });

      return { user, profile };
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign in failed',
        profile: null,
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      disconnect();
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        profile: null,
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const fetchUserProfile = async (walletAddress: string): Promise<UserProfile | null> => {
    try {
      const response = await fetch(`/api/users/profile?address=${walletAddress}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
  };

  const createUserProfile = async (walletAddress: string): Promise<UserProfile> => {
    const response = await fetch('/api/users/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: walletAddress,
        handle: null,
        bio: '',
        avatar: '',
        socials: {
          twitter: '',
          github: '',
          website: '',
          discord: '',
        },
        contentTypes: ['text', 'image', 'audio', 'code'],
        isVerified: false,
        reputation: 0,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create user profile');
    }

    return await response.json();
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<UserProfile> => {
    if (!authState.profile) {
      throw new Error('No profile to update');
    }

    const response = await fetch('/api/users/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    const updatedProfile = await response.json();
    setAuthState(prev => ({
      ...prev,
      profile: updatedProfile,
    }));

    return updatedProfile;
  };

  const generateNonce = async (): Promise<string> => {
    const response = await fetch('/api/auth/nonce');
    const { nonce } = await response.json();
    return nonce;
  };

  return {
    ...authState,
    signIn,
    signOut,
    updateProfile,
    refetch: checkAuthStatus,
  };
}
