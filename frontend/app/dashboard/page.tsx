'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardStable } from '@/components/dashboard/dashboard-stable';
import { ContentFormLite } from '@/components/fingerprint/content-form-lite';
import { useAuth } from '@/contexts/auth-context-stable';
import { Shield, Search, Award } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-2xl mx-auto">
            <Shield className="h-16 w-16 mx-auto mb-6 text-purple-600" />
            <h1 className="text-4xl font-bold mb-4">Access Your Dashboard</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Please log in to view your content fingerprints and manage your ownership certificates.
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild>
                <Link href="/">Go Home</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <DashboardStable />
        </div>
      </div>
    </div>
  );
}
