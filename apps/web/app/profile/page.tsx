'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSiweAuth } from '@/hooks/use-siwe-auth';
import { useAccount } from 'wagmi';
import { User, Edit3, Save, X, Wallet, Star, Trophy, CreditCard } from 'lucide-react';
import { HANDLE_CONFIG } from '@/config/wallet';
import { toast } from '@/components/ui/use-toast';

interface ProfileFormData {
  handle: string;
  bio: string;
  avatar: string;
  socials: {
    twitter: string;
    github: string;
    website: string;
    discord: string;
  };
  contentTypes: string[];
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { profile, updateProfile, isAuthenticated, isLoading } = useSiweAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    handle: '',
    bio: '',
    avatar: '',
    socials: {
      twitter: '',
      github: '',
      website: '',
      discord: '',
    },
    contentTypes: ['text'],
  });
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [checkingHandle, setCheckingHandle] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        handle: profile.handle || '',
        bio: profile.bio,
        avatar: profile.avatar,
        socials: profile.socials,
        contentTypes: profile.contentTypes,
      });
    }
  }, [profile]);

  const checkHandleAvailability = async (handle: string) => {
    if (!handle || handle.length < HANDLE_CONFIG.minLength) {
      setHandleAvailable(null);
      return;
    }

    if (!HANDLE_CONFIG.validationRegex.test(handle)) {
      setHandleAvailable(false);
      return;
    }

    if (HANDLE_CONFIG.reservedNames.includes(handle.toLowerCase())) {
      setHandleAvailable(false);
      return;
    }

    setCheckingHandle(true);
    try {
      const response = await fetch(`/api/users/handle-check?handle=${handle}`);
      const { available } = await response.json();
      setHandleAvailable(available);
    } catch (error) {
      console.error('Handle check failed:', error);
      setHandleAvailable(null);
    } finally {
      setCheckingHandle(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateProfile(formData);
      setIsEditing(false);
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const toggleContentType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      contentTypes: prev.contentTypes.includes(type)
        ? prev.contentTypes.filter(t => t !== type)
        : [...prev.contentTypes, type],
    }));
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground text-center">
              Please connect your wallet to view and edit your profile.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground text-center">
              Please sign in with your wallet to access your profile.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Creator Profile</h1>
          <p className="text-muted-foreground">
            Manage your identity and reputation on The Ownership Layer
          </p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} variant="outline">
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex space-x-2">
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button onClick={() => setIsEditing(false)} variant="outline">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>Your creator identity and verification status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={formData.avatar} />
                <AvatarFallback className="text-lg">
                  {formData.handle?.[0]?.toUpperCase() || address?.slice(2, 4).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {isEditing ? (
                <div className="w-full space-y-2">
                  <Input
                    placeholder="Avatar URL"
                    value={formData.avatar}
                    onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
                  />
                </div>
              ) : null}

              <div className="text-center">
                <h3 className="text-xl font-semibold">
                  {profile?.handle ? `${profile.handle}.own` : 'Anonymous Creator'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
                <div className="flex items-center justify-center space-x-2 mt-2">
                  {profile?.isVerified && (
                    <Badge variant="secondary">
                      ✓ Verified
                    </Badge>
                  )}
                  <Badge variant="outline">
                    Rep: {profile?.reputation || 0}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center mb-1">
                  <CreditCard className="w-4 h-4 mr-1" />
                </div>
                <p className="text-sm text-muted-foreground">Credits</p>
                <p className="text-lg font-semibold">{profile?.credits || 0}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center mb-1">
                  <Trophy className="w-4 h-4 mr-1" />
                </div>
                <p className="text-sm text-muted-foreground">Reputation</p>
                <p className="text-lg font-semibold">{profile?.reputation || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>Customize your creator profile and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Handle */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Handle</label>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex">
                    <Input
                      placeholder="your-handle"
                      value={formData.handle}
                      onChange={(e) => {
                        const handle = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                        setFormData(prev => ({ ...prev, handle }));
                        checkHandleAvailability(handle);
                      }}
                      className="rounded-r-none"
                    />
                    <div className="flex items-center px-3 bg-muted border border-l-0 rounded-r-md">
                      .own
                    </div>
                  </div>
                  {formData.handle && (
                    <div className="text-sm">
                      {checkingHandle ? (
                        <span className="text-muted-foreground">Checking availability...</span>
                      ) : handleAvailable === true ? (
                        <span className="text-green-600">✓ Available</span>
                      ) : handleAvailable === false ? (
                        <span className="text-red-600">✗ Not available</span>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {profile?.handle ? `${profile.handle}.own` : 'No handle set'}
                </p>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Bio</label>
              {isEditing ? (
                <Textarea
                  placeholder="Tell the world about yourself and your creative work..."
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {profile?.bio || 'No bio provided'}
                </p>
              )}
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <label className="text-sm font-medium">Social Links</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(formData.socials).map(([platform, url]) => (
                  <div key={platform} className="space-y-1">
                    <label className="text-xs text-muted-foreground capitalize">
                      {platform}
                    </label>
                    {isEditing ? (
                      <Input
                        placeholder={`Your ${platform} URL`}
                        value={url}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          socials: { ...prev.socials, [platform]: e.target.value }
                        }))}
                      />
                    ) : (
                      <p className="text-sm">
                        {url || <span className="text-muted-foreground">Not set</span>}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Content Types */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Content Types</label>
              <p className="text-xs text-muted-foreground">
                Select the types of content you create
              </p>
              <div className="flex flex-wrap gap-2">
                {['text', 'image', 'audio', 'code'].map((type) => (
                  <Badge
                    key={type}
                    variant={formData.contentTypes.includes(type) ? 'default' : 'outline'}
                    className={isEditing ? 'cursor-pointer' : ''}
                    onClick={isEditing ? () => toggleContentType(type) : undefined}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
