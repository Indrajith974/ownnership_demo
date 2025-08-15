'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Hash, FileText, AlertCircle, CheckCircle, Plus, X } from 'lucide-react';

interface FingerprintData {
  id: string;
  fingerprint_id: string;
  content_type: string;
  content_hash: string;
  content_preview: string;
  title?: string;
  description?: string;
  tags: string[];
  is_public: boolean;
  created_at: string;
}

interface ContentFormProps {
  onSuccess?: (fingerprint: FingerprintData) => void;
}

export function ContentForm({ onSuccess }: ContentFormProps) {
  const { token, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    content: '',
    content_type: 'text',
    title: '',
    description: '',
    tags: [] as string[]
  });
  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [fingerprintResult, setFingerprintResult] = useState<FingerprintData | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !token) {
      setError('Please log in to create fingerprints');
      return;
    }

    if (!formData.content.trim()) {
      setError('Please enter content to fingerprint');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch(`${API_URL}/api/fingerprint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create fingerprint');
      }

      const result = await response.json();
      setFingerprintResult(result);
      setSuccess(true);
      onSuccess?.(result);

      // Reset form
      setFormData({
        content: '',
        content_type: 'text',
        title: '',
        description: '',
        tags: []
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create fingerprint');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in to create content fingerprints and protect your intellectual property.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Create Content Fingerprint
          </CardTitle>
          <CardDescription>
            Generate a cryptographic fingerprint to prove ownership of your content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="content_type">Content Type</Label>
              <Select
                value={formData.content_type}
                onValueChange={(value) => handleChange('content_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                placeholder="Enter your content here..."
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                className="min-h-[120px]"
                disabled={isLoading}
                required
              />
              <p className="text-sm text-muted-foreground">
                Characters: {formData.content.length}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Give your content a title (optional)"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your content (optional)"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="min-h-[80px]"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  disabled={isLoading}
                />
                <Button type="button" onClick={addTag} size="sm" disabled={isLoading}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 ml-1"
                        onClick={() => removeTag(tag)}
                        disabled={isLoading}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Fingerprint...
                </>
              ) : (
                <>
                  <Hash className="mr-2 h-4 w-4" />
                  Create Fingerprint
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {success && fingerprintResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Fingerprint Created Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Fingerprint ID</Label>
              <p className="text-sm font-mono bg-muted p-2 rounded">
                {fingerprintResult.fingerprint_id}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Content Hash</Label>
              <p className="text-sm font-mono bg-muted p-2 rounded break-all">
                {fingerprintResult.content_hash}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Content Preview</Label>
              <p className="text-sm bg-muted p-2 rounded">
                {fingerprintResult.content_preview}
              </p>
            </div>
            {fingerprintResult.tags.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Tags</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {fingerprintResult.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
