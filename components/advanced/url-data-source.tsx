"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Globe, Download, AlertCircle } from "lucide-react"
import type { DataFile } from "@/components/file-upload"

interface UrlDataSourceProps {
  onFileLoaded: (file: DataFile) => void
}

export function UrlDataSource({ onFileLoaded }: UrlDataSourceProps) {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUrlLoad = async () => {
    if (!url.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      // Validate URL
      const urlObj = new URL(url)
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        throw new Error("Only HTTP and HTTPS URLs are supported")
      }

      // Determine file type from URL
      const pathname = urlObj.pathname.toLowerCase()
      let fileType: string
      let mimeType: string

      if (pathname.endsWith(".csv")) {
        fileType = "csv"
        mimeType = "text/csv"
      } else if (pathname.endsWith(".xlsx") || pathname.endsWith(".xls")) {
        fileType = "xlsx"
        mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      } else if (pathname.endsWith(".json")) {
        fileType = "json"
        mimeType = "application/json"
      } else {
        throw new Error("Unsupported file format. Please use CSV, XLSX, or JSON files.")
      }

      // Simulate file loading (in real implementation, you'd fetch the actual file)
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Create mock data based on file type
      let mockData: any[] = []
      let mockColumns: string[] = []

      if (fileType === "csv" || fileType === "xlsx") {
        mockColumns = ["id", "name", "value", "category"]
        mockData = Array.from({ length: 100 }, (_, i) => ({
          id: i + 1,
          name: `Item ${i + 1}`,
          value: Math.round(Math.random() * 1000),
          category: ["A", "B", "C"][Math.floor(Math.random() * 3)],
        }))
      } else if (fileType === "json") {
        mockData = [
          { key: "sample", data: "from URL" },
          { key: "loaded", data: "successfully" },
        ]
        mockColumns = Object.keys(mockData[0] || {})
      }

      const fileName = pathname.split("/").pop() || "url_data"
      const newFile: DataFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: fileName,
        size: JSON.stringify(mockData).length,
        type: mimeType,
        status: "ready",
        progress: 100,
        data: mockData,
        columns: mockColumns,
        rows: mockData.length,
        source: "url",
        sourceUrl: url,
      }

      onFileLoaded(newFile)
      setUrl("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data from URL")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Load from URL
        </CardTitle>
        <CardDescription>Import data directly from web URLs (CSV, XLSX, JSON formats supported)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="dataUrl" className="text-sm font-medium">
            Data URL
          </Label>
          <input
            id="dataUrl"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/data.csv"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Supported formats: CSV, XLSX, JSON</div>
          <Button onClick={handleUrlLoad} disabled={!url.trim() || isLoading} className="flex items-center gap-2">
            <Download className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Loading..." : "Load Data"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
