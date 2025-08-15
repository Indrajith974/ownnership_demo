import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Upload, Mic, Image, Code, FileText } from 'lucide-react'

export default function CreatePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Create & Protect</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Drop your original content here to fingerprint and protect it forever
            </p>
          </div>

          {/* Content Type Selection */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <FileText className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                <CardTitle className="text-sm">Text</CardTitle>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <Image className="h-8 w-8 mx-auto text-green-600 mb-2" />
                <CardTitle className="text-sm">Image</CardTitle>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <Mic className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                <CardTitle className="text-sm">Audio</CardTitle>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <Code className="h-8 w-8 mx-auto text-orange-600 mb-2" />
                <CardTitle className="text-sm">Code</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Main Creation Area */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Create Your Content</CardTitle>
              <CardDescription>
                Write, upload, or record your original content to generate a unique fingerprint
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Text Input */}
              <div>
                <label className="block text-sm font-medium mb-2">Text Content</label>
                <Textarea
                  placeholder="Write your original text, idea, or story here..."
                  className="min-h-[200px]"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">Upload Files</label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    Drag and drop your files here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports images, audio, code files, and documents
                  </p>
                  <Button variant="outline" className="mt-4">
                    Choose Files
                  </Button>
                </div>
              </div>

              {/* Voice Recording */}
              <div>
                <label className="block text-sm font-medium mb-2">Voice Recording</label>
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <Button variant="outline" size="sm">
                    <Mic className="h-4 w-4 mr-2" />
                    Start Recording
                  </Button>
                  <span className="text-sm text-gray-500">
                    Record your voice note or idea
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Button size="lg" className="flex-1">
                  Generate Fingerprint
                </Button>
                <Button variant="outline" size="lg">
                  Save Draft
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-semibold mb-2">1. Create</div>
                  <p className="text-gray-600 dark:text-gray-300">
                    Upload or create your original content
                  </p>
                </div>
                <div>
                  <div className="font-semibold mb-2">2. Fingerprint</div>
                  <p className="text-gray-600 dark:text-gray-300">
                    AI generates a unique signature for your work
                  </p>
                </div>
                <div>
                  <div className="font-semibold mb-2">3. Protect</div>
                  <p className="text-gray-600 dark:text-gray-300">
                    Your ownership is recorded and tracked forever
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
