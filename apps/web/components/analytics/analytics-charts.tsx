'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  FileText,
  Award,
  Shield,
  Users,
  Globe
} from 'lucide-react';

// Mock data - in production, this would come from your API/database
const fingerprintData = [
  { month: 'Jan', fingerprints: 12, nfts: 8, matches: 3 },
  { month: 'Feb', fingerprints: 19, nfts: 12, matches: 5 },
  { month: 'Mar', fingerprints: 25, nfts: 18, matches: 7 },
  { month: 'Apr', fingerprints: 31, nfts: 22, matches: 9 },
  { month: 'May', fingerprints: 28, nfts: 20, matches: 11 },
  { month: 'Jun', fingerprints: 35, nfts: 28, matches: 13 },
];

const contentTypeData = [
  { name: 'Images', value: 45, color: '#3b82f6' },
  { name: 'Videos', value: 25, color: '#ef4444' },
  { name: 'Audio', value: 15, color: '#10b981' },
  { name: 'Text', value: 10, color: '#f59e0b' },
  { name: 'Code', value: 5, color: '#8b5cf6' },
];

const recentActivity = [
  { date: '2024-01-15', action: 'NFT Minted', content: 'Digital Art #001', type: 'success' },
  { date: '2024-01-14', action: 'Fingerprint Created', content: 'Video Content', type: 'info' },
  { date: '2024-01-13', action: 'Match Found', content: 'Similar Image Detected', type: 'warning' },
  { date: '2024-01-12', action: 'Content Uploaded', content: 'Audio Track #5', type: 'info' },
  { date: '2024-01-11', action: 'Certificate Verified', content: 'Ownership Proof', type: 'success' },
];

const platformStats = [
  { label: 'Total Users', value: '12,847', change: '+12%', trend: 'up', icon: Users },
  { label: 'Global Fingerprints', value: '1.2M', change: '+8%', trend: 'up', icon: FileText },
  { label: 'NFTs Minted', value: '45,231', change: '+15%', trend: 'up', icon: Award },
  { label: 'Matches Detected', value: '8,934', change: '+5%', trend: 'up', icon: Shield },
];

export function AnalyticsCharts() {
  return (
    <div className="space-y-6">
      {/* Platform Overview Stats */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Platform Overview
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {platformStats.map((stat) => {
            const Icon = stat.icon;
            const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
            return (
              <Card key={stat.label}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <Icon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="flex items-center mt-2">
                    <TrendIcon className={`h-4 w-4 mr-1 ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`} />
                    <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change}
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">vs last month</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fingerprint Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Trends
            </CardTitle>
            <CardDescription>Monthly fingerprints, NFTs, and matches over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={fingerprintData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="fingerprints" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Fingerprints"
                />
                <Line 
                  type="monotone" 
                  dataKey="nfts" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="NFTs Minted"
                />
                <Line 
                  type="monotone" 
                  dataKey="matches" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Matches Found"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Content Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Content Type Distribution</CardTitle>
            <CardDescription>Breakdown of fingerprinted content by type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={contentTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {contentTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Growth</CardTitle>
          <CardDescription>Cumulative growth in platform activity</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={fingerprintData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="fingerprints" 
                stackId="1"
                stroke="#3b82f6" 
                fill="#3b82f6"
                fillOpacity={0.6}
                name="Fingerprints"
              />
              <Area 
                type="monotone" 
                dataKey="nfts" 
                stackId="1"
                stroke="#10b981" 
                fill="#10b981"
                fillOpacity={0.6}
                name="NFTs"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest actions and events on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={activity.type === 'success' ? 'default' : 
                            activity.type === 'warning' ? 'destructive' : 'secondary'}
                  >
                    {activity.action}
                  </Badge>
                  <span className="font-medium">{activity.content}</span>
                </div>
                <span className="text-sm text-muted-foreground">{activity.date}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
