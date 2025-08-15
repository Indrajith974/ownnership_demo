'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAccount } from 'wagmi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { 
  FileText,
  Award,
  Shield,
  TrendingUp,
  Calendar,
  Clock,
  Star,
  Target
} from 'lucide-react';

// Mock user data - in production, this would come from your API based on connected wallet
const userStats = {
  totalFingerprints: 47,
  totalNFTs: 23,
  matchesFound: 8,
  vaultItems: 52,
  joinDate: '2024-01-01',
  lastActive: '2024-01-15',
  reputation: 85,
  level: 'Creator Pro'
};

const userActivityData = [
  { day: 'Mon', uploads: 3, mints: 1, matches: 0 },
  { day: 'Tue', uploads: 5, mints: 2, matches: 1 },
  { day: 'Wed', uploads: 2, mints: 1, matches: 0 },
  { day: 'Thu', uploads: 7, mints: 3, matches: 2 },
  { day: 'Fri', uploads: 4, mints: 2, matches: 1 },
  { day: 'Sat', uploads: 6, mints: 4, matches: 0 },
  { day: 'Sun', uploads: 3, mints: 1, matches: 1 },
];

const monthlyProgress = [
  { month: 'Oct', fingerprints: 8, target: 15 },
  { month: 'Nov', fingerprints: 12, target: 15 },
  { month: 'Dec', fingerprints: 18, target: 20 },
  { month: 'Jan', fingerprints: 9, target: 20 },
];

const achievements = [
  { title: 'First Upload', description: 'Created your first fingerprint', completed: true, date: '2024-01-01' },
  { title: 'NFT Creator', description: 'Minted your first NFT certificate', completed: true, date: '2024-01-03' },
  { title: 'Content Guardian', description: 'Found 5 content matches', completed: true, date: '2024-01-10' },
  { title: 'Vault Master', description: 'Store 50+ items in your vault', completed: true, date: '2024-01-12' },
  { title: 'Platform Ambassador', description: 'Reach 100 reputation points', completed: false, progress: 85 },
  { title: 'Content Creator', description: 'Upload 100 unique fingerprints', completed: false, progress: 47 },
];

export function UserAnalytics() {
  const { isConnected, address } = useAccount();

  if (!isConnected) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center space-y-2">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">Connect Wallet for Personal Analytics</h3>
            <p className="text-muted-foreground">
              Connect your wallet to view your personal usage statistics and achievements
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Your Fingerprints</p>
                <p className="text-2xl font-bold">{userStats.totalFingerprints}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
              <span className="text-sm font-medium text-green-600">+12%</span>
              <span className="text-sm text-muted-foreground ml-1">this month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">NFTs Minted</p>
                <p className="text-2xl font-bold">{userStats.totalNFTs}</p>
              </div>
              <Award className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
              <span className="text-sm font-medium text-green-600">+8%</span>
              <span className="text-sm text-muted-foreground ml-1">this month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Matches Found</p>
                <p className="text-2xl font-bold">{userStats.matchesFound}</p>
              </div>
              <Shield className="h-8 w-8 text-red-500" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
              <span className="text-sm font-medium text-green-600">+3</span>
              <span className="text-sm text-muted-foreground ml-1">this week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Reputation</p>
                <p className="text-2xl font-bold">{userStats.reputation}</p>
              </div>
              <Star className="h-8 w-8 text-purple-500" />
            </div>
            <div className="flex items-center mt-2">
              <Badge variant="secondary">{userStats.level}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Activity
          </CardTitle>
          <CardDescription>Your activity breakdown for the past week</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={userActivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="uploads" fill="#3b82f6" name="Uploads" />
              <Bar dataKey="mints" fill="#10b981" name="NFT Mints" />
              <Bar dataKey="matches" fill="#ef4444" name="Matches" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Monthly Goals
            </CardTitle>
            <CardDescription>Track your progress towards monthly targets</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyProgress}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="fingerprints" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Fingerprints Created"
                />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Target"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Wallet Address</span>
              <span className="text-sm font-mono">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Member Since</span>
              <span className="text-sm">{userStats.joinDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Last Active</span>
              <span className="text-sm">{userStats.lastActive}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Vault Items</span>
              <span className="text-sm font-semibold">{userStats.vaultItems}</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Reputation Progress</span>
                <span className="text-sm">{userStats.reputation}/100</span>
              </div>
              <Progress value={userStats.reputation} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
          <CardDescription>Your milestones and accomplishments on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {achievements.map((achievement, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg border ${
                  achievement.completed 
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                    : 'bg-muted/50 border-muted'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-semibold">{achievement.title}</h4>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    {achievement.completed && achievement.date && (
                      <p className="text-xs text-green-600">Completed on {achievement.date}</p>
                    )}
                  </div>
                  <div className="flex items-center">
                    {achievement.completed ? (
                      <Badge className="bg-green-500">Completed</Badge>
                    ) : (
                      <Badge variant="outline">{achievement.progress}%</Badge>
                    )}
                  </div>
                </div>
                {!achievement.completed && achievement.progress && (
                  <div className="mt-3">
                    <Progress value={achievement.progress} className="h-2" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
