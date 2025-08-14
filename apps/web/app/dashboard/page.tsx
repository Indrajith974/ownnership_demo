'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WalletButton } from '@/components/wallet/wallet-button';
import { WalletStatus } from '@/components/wallet/wallet-status';
import { AnalyticsCharts } from '@/components/analytics/analytics-charts';
import { UserAnalytics } from '@/components/analytics/user-analytics';
import { useAccount } from 'wagmi';
import { 
  Upload, 
  Search, 
  Award, 
  Database, 
  Coins, 
  BarChart3,
  Sparkles,
  Zap,
  Trophy,
  FileText,
  Youtube,
  Instagram
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { isConnected, address } = useAccount();

  const features = [
    {
      title: 'Upload & Fingerprint',
      description: 'Upload files and generate unique fingerprints for ownership proof',
      icon: Upload,
      href: '/create',
      color: 'bg-blue-500',
    },
    {
      title: 'Trace Content',
      description: 'Search and trace content across the platform',
      icon: Search,
      href: '/trace',
      color: 'bg-green-500',
    },
    {
      title: 'Mint NFT Certificate',
      description: 'Create NFT certificates for your original content',
      icon: Award,
      href: '/mint',
      color: 'bg-purple-500',
    },
    {
      title: 'My Vault',
      description: 'View all your fingerprinted content and ownership records',
      icon: Database,
      href: '/vault',
      color: 'bg-orange-500',
    },
    {
      title: 'Certificates',
      description: 'Manage your NFT ownership certificates',
      icon: Coins,
      href: '/certificates',
      color: 'bg-yellow-500',
    },
    {
      title: 'Cross-Match',
      description: 'Detect duplicate or similar content across the platform',
      icon: BarChart3,
      href: '/cross-matching',
      color: 'bg-red-500',
    },
  ];

  const integrations = [
    {
      title: 'YouTube Integration',
      description: 'Import and fingerprint YouTube videos',
      icon: Youtube,
      color: 'bg-red-600',
    },
    {
      title: 'Instagram Integration',
      description: 'Import and fingerprint Instagram posts',
      icon: Instagram,
      color: 'bg-pink-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            The Ownership Layer Dashboard
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Protect your digital creations with cryptographic fingerprinting, NFT certificates, and decentralized ownership proof.
          </p>
        </div>

        {/* Wallet Status */}
        <div className="max-w-md mx-auto">
          <WalletStatus />
        </div>

        {/* Quick Stats */}
        {isConnected && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="flex items-center p-6">
                <FileText className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-muted-foreground">Fingerprints</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center p-6">
                <Trophy className="h-8 w-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-muted-foreground">NFT Certificates</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center p-6">
                <Zap className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-muted-foreground">Matches Found</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center p-6">
                <Sparkles className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-muted-foreground">Vault Items</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analytics Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Analytics & Insights</h2>
          <Tabs defaultValue="platform" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="platform">Platform Analytics</TabsTrigger>
              <TabsTrigger value="personal">Personal Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="platform" className="space-y-6">
              <AnalyticsCharts />
            </TabsContent>
            
            <TabsContent value="personal" className="space-y-6">
              <UserAnalytics />
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Features */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Core Features</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link key={feature.title} href={feature.href}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardHeader>
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${feature.color}`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <CardTitle className="group-hover:text-blue-600 transition-colors">
                          {feature.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Platform Integrations */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Platform Integrations</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {integrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <Card key={integration.title}>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${integration.color}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle>{integration.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{integration.description}</CardDescription>
                    <Badge variant="secondary" className="mt-2">
                      Available
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Getting Started */}
        {!isConnected && (
          <Card className="border-2 border-dashed border-blue-200 dark:border-blue-800">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                Get Started
              </CardTitle>
              <CardDescription>
                Connect your wallet to start protecting your digital creations
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <WalletButton size="lg" />
              <p className="text-sm text-muted-foreground mt-4">
                Once connected, you can upload content, generate fingerprints, and mint NFT certificates
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>The Ownership Layer - Restoring dignity and ownership to every creator</p>
        </div>
      </div>
    </div>
  );
}
