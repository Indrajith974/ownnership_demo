'use client';

import React, { useState, useCallback, memo } from 'react';
import { useAuth } from '@/contexts/auth-context-optimized';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Hash, AlertCircle, CheckCircle } from 'lucide-react';

interface ContentFormProps {
  onSuccess?: () => void;
}

const SuccessAlert = memo(({ fingerprintId, contentHash }: { fingerprintId: string; contentHash: string }) => (
  <Alert className="border-green-200 bg-green-50">
    <CheckCircle className="h-4 w-4 text-green-600" />
    <AlertDescription className="text-green-800">
      <div className="space-y-2">
        <div className="font-medium">Fingerprint created successfully!</div>
        <div className="text-sm">
          <div className="font-mono bg-white p-2 rounded text-xs break-all">
            ID: {fingerprintId}
          </div>
          <div className="font-mono bg-white p-2 rounded text-xs break-all mt-1">
            Hash: {contentHash}
          </div>
        </div>
      </div>
    </AlertDescription>
  </Alert>
));

export function ContentFormLite({ onSuccess }: ContentFormProps) {
  const { token, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    content: '',
    content_type: 'text',
    title: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ fingerprintId: string; contentHash: string } | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(''); // Clear error on input
    if (success) setSuccess(null); // Clear success on new input
  }, [error, success]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/fingerprint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: formData.content,
          content_type: formData.content_type,
          title: formData.title || undefined,
          description: formData.description || undefined,
          tags: [] // Simplified - no tags for lite version
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create fingerprint');
      }

      const result = await response.json();
      setSuccess({
        fingerprintId: result.fingerprint_id,
        contentHash: result.content_hash
      });
      onSuccess?.();

      // Reset form
      setFormData({
        content: '',
        content_type: 'text',
        title: '',
        description: ''
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create fingerprint');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token, formData, API_URL, onSuccess]);

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in to create content fingerprints.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Create Content Fingerprint
          </CardTitle>
          <CardDescription>
            Generate a cryptographic fingerprint to prove ownership
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="content_type">Content Type</Label>
                <Select
                  value={formData.content_type}
                  onValueChange={(value) => handleChange('content_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
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
                <Label htmlFor="title">Title (Optional)</Label>
                <Input
                  id="title"
                  placeholder="Content title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                placeholder="Enter your content here..."
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                className="min-h-[100px] resize-y"
                disabled={isLoading}
                required
              />
              <div className="text-xs text-muted-foreground text-right">
                {formData.content.length} characters
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe your content"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="min-h-[60px] resize-y"
                disabled={isLoading}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || !formData.content.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
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

      {success && (
        <SuccessAlert
          fingerprintId={success.fingerprintId}
          contentHash={success.contentHash}
        />
      )}
    </div>
  );
}
