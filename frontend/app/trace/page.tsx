import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Search, Link, Upload, Zap } from 'lucide-react'

export default function TracePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Trace Content Origins</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Find the original creator and track the journey of any content across the internet
            </p>
          </div>

          {/* Search Methods */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="text-center">
              <CardHeader>
                <Link className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                <CardTitle className="text-sm">URL Trace</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Enter any URL to trace its content origins
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Upload className="h-8 w-8 mx-auto text-green-600 mb-2" />
                <CardTitle className="text-sm">File Upload</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Upload content to find similar or copied versions
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Search className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                <CardTitle className="text-sm">Text Search</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Paste text to find its original source
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Main Trace Interface */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Trace Content</CardTitle>
              <CardDescription>
                Enter a URL, upload content, or paste text to trace its origins
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* URL Input */}
              <div>
                <label className="block text-sm font-medium mb-2">URL to Trace</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/content-to-trace"
                    className="flex-1"
                  />
                  <Button>
                    <Search className="h-4 w-4 mr-2" />
                    Trace URL
                  </Button>
                </div>
              </div>

              <div className="text-center text-gray-500">or</div>

              {/* Text Input */}
              <div>
                <label className="block text-sm font-medium mb-2">Text Content</label>
                <Textarea
                  placeholder="Paste the text content you want to trace..."
                  className="min-h-[150px]"
                />
              </div>

              <div className="text-center text-gray-500">or</div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">Upload Content</label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    Drop files here or click to browse
                  </p>
                  <Button variant="outline" size="sm">
                    Choose Files
                  </Button>
                </div>
              </div>

              {/* Action Button */}
              <Button size="lg" className="w-full">
                <Zap className="h-4 w-4 mr-2" />
                Start Tracing
              </Button>
            </CardContent>
          </Card>

          {/* Results Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trace Results</CardTitle>
              <CardDescription>
                Results will appear here after tracing content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No traces yet. Enter content above to get started.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
