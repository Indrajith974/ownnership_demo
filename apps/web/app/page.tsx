import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Shield, Zap, Globe, Users } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
            The Ownership Layer
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            Restore dignity and ownership to every creator.<br />
            <span className="font-semibold">Every idea, post, design, meme, voice note, code, lyric = yours, forever.</span>
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-12">
            If someone uses it — you're credited, tracked, rewarded.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/create">
              <Button size="lg" className="text-lg px-8 py-3">
                Start Creating
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/trace">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                Trace Content
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="text-center">
            <CardHeader>
              <Shield className="h-12 w-12 mx-auto text-blue-600 mb-4" />
              <CardTitle>Protect Your Work</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                AI-powered fingerprinting for text, images, audio, and code
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Zap className="h-12 w-12 mx-auto text-purple-600 mb-4" />
              <CardTitle>Instant Attribution</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Real-time tracking and attribution when your content is reused
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Globe className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <CardTitle>Global Protocol</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Decentralized ownership layer for the entire internet
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 mx-auto text-orange-600 mb-4" />
              <CardTitle>Creator Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Automatic royalties and credit for original creators
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Own Your Creations?</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Join the protocol that puts creators first
          </p>
          <Link href="/dashboard">
            <Button size="lg" variant="outline" className="text-lg px-8 py-3">
              View Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
