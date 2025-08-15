import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if we have valid Supabase configuration
const hasValidSupabaseConfig = 
  supabaseUrl && 
  supabaseAnonKey &&
  supabaseUrl.includes('supabase.co');

export const createClient = () => {
  if (!hasValidSupabaseConfig) {
    console.warn('⚠️ Supabase not configured. Using mock client. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    
    // Return a mock client that won't cause errors
    return {
      auth: {
        signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        signOut: () => Promise.resolve({ error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      },
      from: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        update: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        delete: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        subscribe: () => ({ unsubscribe: () => {} })
      }),
      channel: () => ({
        on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
        subscribe: () => ({ unsubscribe: () => {} }),
        unsubscribe: () => {}
      })
    } as any;
  }
  
  return createSupabaseClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
};

// Create a singleton instance for the app
export const supabase = createClient();

// Helper functions for real-time subscriptions
export const subscribeToUserData = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`user-${userId}`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'profiles',
        filter: `id=eq.${userId}`
      }, 
      callback
    )
    .subscribe();
};

export const subscribeToUserFingerprints = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`fingerprints-${userId}`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'fingerprints',
        filter: `user_id=eq.${userId}`
      }, 
      callback
    )
    .subscribe();
};

export const subscribeToUserNFTs = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`nfts-${userId}`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'nft_mints',
        filter: `user_id=eq.${userId}`
      }, 
      callback
    )
    .subscribe();
};

// Analytics helper
export const trackEvent = async (eventType: string, eventData: any, userId?: string) => {
  return await supabase
    .from('analytics_events')
    .insert({
      user_id: userId || null,
      event_type: eventType,
      event_data: eventData,
      ip_address: null, // Will be handled by backend
      user_agent: typeof window !== 'undefined' ? navigator.userAgent : null,
    });
};

// Export a flag to check if Supabase is properly configured
export const isSupabaseConfigured = hasValidSupabaseConfig;
