'use client';

import { WalletButton } from '@/components/wallet/wallet-button';
import { WalletStatus } from '@/components/wallet/wallet-status';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function WalletTestPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Wallet Connection UI Test</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Test the new clean, professional wallet connection interface built from scratch.
          This demonstrates the complete wallet connection flow with proper error handling and user feedback.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Wallet Connection Button</CardTitle>
            <CardDescription>
              Clean, professional wallet connect button with connection states
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <WalletButton />
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>• Shows "Connect Wallet" when disconnected</p>
              <p>• Displays address and connection status when connected</p>
              <p>• Opens professional modal for wallet management</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wallet Status</CardTitle>
            <CardDescription>
              Real-time wallet connection status and information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WalletStatus />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <CardDescription>
            Complete wallet connection UI rebuilt from scratch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-semibold text-green-600">✅ Implemented</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Professional wallet connection modal</li>
                <li>• Clean wallet connect button with states</li>
                <li>• Real-time connection status display</li>
                <li>• Address copying with toast feedback</li>
                <li>• Etherscan integration for address viewing</li>
                <li>• Proper error handling and user feedback</li>
                <li>• Responsive design for all screen sizes</li>
                <li>• TypeScript support with proper types</li>
                <li>• Integration with RainbowKit and wagmi</li>
                <li>• Theme support (light/dark mode)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-600">🎨 UI/UX Features</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Animated connection status indicators</li>
                <li>• Professional color scheme and badges</li>
                <li>• Clear visual feedback for all actions</li>
                <li>• Accessible design with proper ARIA labels</li>
                <li>• Consistent styling with ShadCN components</li>
                <li>• Loading states and progress indicators</li>
                <li>• Error states with helpful messages</li>
                <li>• Smooth transitions and animations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
