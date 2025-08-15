'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Activity, 
  FileText, 
  Award, 
  Users, 
  Zap,
  RefreshCw,
  Plus,
  Hash
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context-stable';
import { toast } from '@/components/ui/use-toast';
import { createClient } from '@supabase/supabase-js';

interface Fingerprint {
  id: string;
  fingerprint_id: string;
  content_type: string;
  content_hash: string;
  title?: string;
  description?: string;
  tags?: string[];
  created_at: string;
}

// Initialize Supabase client for fingerprint sync
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.warn('Supabase client initialization failed:', error);
  }
}

// Helper function to sync fingerprint to Supabase
const syncFingerprintToSupabase = async (fingerprintData: any, userId: string) => {
  if (!supabase) return;
  
  try {
    await supabase
      .from('fingerprints')
      .insert({
        user_id: userId,
        hash: fingerprintData.content_hash,
        title: fingerprintData.title,
        description: fingerprintData.description,
        content_type: fingerprintData.content_type,
        tags: fingerprintData.tags || [],
        created_at: new Date().toISOString()
      });
    
    console.log('✅ Fingerprint synced to Supabase');
    
    // Track event
    await supabase
      .from('analytics_events')
      .insert({
        user_id: userId,
        event_type: 'fingerprint_created',
        event_data: {
          content_type: fingerprintData.content_type,
          title: fingerprintData.title
        },
        created_at: new Date().toISOString()
      });
      
    console.log('✅ Fingerprint creation event tracked');
  } catch (error) {
    console.warn('Supabase fingerprint sync error:', error);
  }
};

export function DashboardStable() {
  const { user, isAuthenticated } = useAuth();
  const [fingerprints, setFingerprints] = useState<Fingerprint[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form state for creating fingerprints
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState('text');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  // Load user fingerprints
  const loadFingerprints = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:8000/api/fingerprints', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFingerprints(data);
      } else {
        console.error('Failed to load fingerprints');
      }
    } catch (error) {
      console.error('Error loading fingerprints:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create new fingerprint
  const createFingerprint = async () => {
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Please enter some content to fingerprint",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:8000/api/fingerprint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          content_type: contentType,
          title: title || undefined,
          description: description || undefined,
          tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        }),
      });

      if (response.ok) {
        const newFingerprint = await response.json();
        setFingerprints(prev => [newFingerprint, ...prev]);
        
        // Sync to Supabase
        if (user) {
          await syncFingerprintToSupabase(newFingerprint, user.id);
        }
        
        // Reset form
        setContent('');
        setTitle('');
        setDescription('');
        setTags('');
        
        toast({
          title: "Success",
          description: "Content fingerprint created and synced to Supabase!",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.detail || "Failed to create fingerprint",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating fingerprint:', error);
      toast({
        title: "Error",
        description: "Network error while creating fingerprint",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadFingerprints();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Please Login</h3>
            <p className="text-muted-foreground text-center">
              Log in to view your dashboard and manage your content.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.full_name || user?.username || user?.email}!
          </p>
        </div>
        <Button onClick={loadFingerprints} variant="outline" disabled={loading}>
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
              Content pieces protected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">
              Account is verified
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
              {user?.wallet_address ? '✓' : '○'}
            </div>
            <p className="text-xs text-muted-foreground">
              {user?.wallet_address ? 'Connected' : 'Not connected'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NFTs</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Certificates minted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for content management */}
      <Tabs defaultValue="fingerprints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fingerprints">My Fingerprints</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
        </TabsList>

        <TabsContent value="fingerprints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Fingerprints</CardTitle>
              <CardDescription>
                Your protected content and ownership records
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
                  <p className="text-sm text-muted-foreground mt-2">
                    Create your first fingerprint to protect your content
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fingerprints.map((fingerprint) => (
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
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-mono">
                          {fingerprint.content_hash.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Content Fingerprint</CardTitle>
              <CardDescription>
                Protect your content by creating a unique fingerprint
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  placeholder="Enter your content here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Content title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contentType">Content Type</Label>
                  <select
                    id="contentType"
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="text">Text</option>
                    <option value="code">Code</option>
                    <option value="design">Design</option>
                    <option value="audio">Audio</option>
                    <option value="video">Video</option>
                    <option value="image">Image</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of your content"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  placeholder="tag1, tag2, tag3"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Separate tags with commas
                </p>
              </div>

              <Button 
                onClick={createFingerprint} 
                disabled={creating || !content.trim()}
                className="w-full"
              >
                {creating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Fingerprint
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
