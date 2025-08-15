'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  FileText, 
  Award, 
  TrendingUp, 
  Users, 
  Eye,
  Zap,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context-stable';
import { supabase, subscribeToUserFingerprints, subscribeToUserNFTs, trackEvent } from '@/utils/supabase/client';
import { Database } from '@/types/supabase';

type Fingerprint = Database['public']['Tables']['fingerprints']['Row'];
type NFTMint = Database['public']['Tables']['nft_mints']['Row'];
type AnalyticsEvent = Database['public']['Tables']['analytics_events']['Row'];

export function DashboardSupabase() {
  const { user, profile, isAuthenticated, session } = useAuth();
  const [fingerprints, setFingerprints] = useState<Fingerprint[]>([]);
  const [nftMints, setNftMints] = useState<NFTMint[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeSubscriptions, setRealtimeSubscriptions] = useState<any[]>([]);

  // Load user data and set up real-time subscriptions
  useEffect(() => {
    if (isAuthenticated && session?.user) {
      loadUserData();
      setupRealtimeSubscriptions();
      
      // Track dashboard view
      trackEvent('dashboard_viewed', { 
        timestamp: new Date().toISOString() 
      }, session.user.id);
    }

    return () => {
      // Cleanup subscriptions
      realtimeSubscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [isAuthenticated, session]);

  const loadUserData = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);

      // Load fingerprints
      const { data: fingerprintsData } = await supabase
        .from('fingerprints')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      // Load NFT mints
      const { data: nftMintsData } = await supabase
        .from('nft_mints')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      // Load recent analytics
      const { data: analyticsData } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setFingerprints(fingerprintsData || []);
      setNftMints(nftMintsData || []);
      setAnalytics(analyticsData || []);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!session?.user) return;

    const userId = session.user.id;
    const subscriptions: any[] = [];

    // Subscribe to fingerprints changes
    const fingerprintsSubscription = subscribeToUserFingerprints(userId, (payload) => {
      console.log('Real-time fingerprints update:', payload);
      
      if (payload.eventType === 'INSERT') {
        setFingerprints(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setFingerprints(prev => prev.map(fp => fp.id === payload.new.id ? payload.new : fp));
      } else if (payload.eventType === 'DELETE') {
        setFingerprints(prev => prev.filter(fp => fp.id !== payload.old.id));
      }
    });

    // Subscribe to NFT mints changes
    const nftSubscription = subscribeToUserNFTs(userId, (payload) => {
      console.log('Real-time NFTs update:', payload);
      
      if (payload.eventType === 'INSERT') {
        setNftMints(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setNftMints(prev => prev.map(nft => nft.id === payload.new.id ? payload.new : nft));
      } else if (payload.eventType === 'DELETE') {
        setNftMints(prev => prev.filter(nft => nft.id !== payload.old.id));
      }
    });

    subscriptions.push(fingerprintsSubscription, nftSubscription);
    setRealtimeSubscriptions(subscriptions);
  };

  const handleRefresh = useCallback(async () => {
    await loadUserData();
    
    if (session?.user) {
      await trackEvent('dashboard_refreshed', { 
        timestamp: new Date().toISOString() 
      }, session.user.id);
    }
  }, [session]);

  const getAnalyticsStats = () => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentEvents = analytics.filter(event => 
      new Date(event.created_at) >= weekAgo
    );

    const eventTypes = recentEvents.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEvents: recentEvents.length,
      uniqueEventTypes: Object.keys(eventTypes).length,
      topEvents: Object.entries(eventTypes)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
    };
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Please Login</h3>
            <p className="text-muted-foreground text-center">
              Log in to view your real-time dashboard with analytics and content data.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = getAnalyticsStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Real-time Dashboard</h1>
          <p className="text-muted-foreground">
            Live data from Supabase • Welcome back, {profile?.full_name || profile?.username || 'User'}!
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fingerprints</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fingerprints.length}</div>
            <p className="text-xs text-muted-foreground">
              Content pieces fingerprinted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NFTs Minted</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nftMints.length}</div>
            <p className="text-xs text-muted-foreground">
              Ownership certificates created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activity (7 days)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              Total actions performed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Status</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profile?.wallet_address ? '✓' : '○'}
            </div>
            <p className="text-xs text-muted-foreground">
              {profile?.wallet_address ? 'Connected' : 'Not connected'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed data */}
      <Tabs defaultValue="fingerprints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fingerprints">Content Fingerprints</TabsTrigger>
          <TabsTrigger value="nfts">NFT Certificates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="fingerprints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Fingerprints</CardTitle>
              <CardDescription>
                Your latest content fingerprints • Updates in real-time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : fingerprints.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No fingerprints created yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fingerprints.slice(0, 5).map((fingerprint) => (
                    <div key={fingerprint.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{fingerprint.title || 'Untitled'}</h4>
                        <p className="text-sm text-muted-foreground">
                          {fingerprint.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {fingerprint.content_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(fingerprint.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {fingerprint.hash.slice(0, 8)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nfts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>NFT Certificates</CardTitle>
              <CardDescription>
                Your minted ownership certificates • Updates in real-time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : nftMints.length === 0 ? (
                <div className="text-center py-8">
                  <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No NFTs minted yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {nftMints.slice(0, 5).map((nft) => (
                    <div key={nft.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">Token #{nft.token_id || 'Pending'}</h4>
                        <p className="text-sm text-muted-foreground">
                          Chain ID: {nft.chain_id || 'Unknown'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant={nft.mint_status === 'minted' ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {nft.mint_status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(nft.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {nft.transaction_hash && (
                        <div className="text-xs text-muted-foreground font-mono">
                          {nft.transaction_hash.slice(0, 8)}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Overview</CardTitle>
              <CardDescription>
                Your activity analytics • Real-time tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{stats.totalEvents}</div>
                    <p className="text-sm text-muted-foreground">Total Events (7d)</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{stats.uniqueEventTypes}</div>
                    <p className="text-sm text-muted-foreground">Event Types</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{analytics.length}</div>
                    <p className="text-sm text-muted-foreground">Total Tracked</p>
                  </div>
                </div>

                {stats.topEvents.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Top Activities</h4>
                    <div className="space-y-2">
                      {stats.topEvents.map(([eventType, count]) => (
                        <div key={eventType} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">{eventType.replace('_', ' ')}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
