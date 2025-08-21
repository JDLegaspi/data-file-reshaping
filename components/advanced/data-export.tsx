"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Download, FileSpreadsheet, FileText, Database } from "lucide-react"
import type { DataFile } from "@/components/file-upload"

interface DataExportProps {
  files: DataFile[]
}

export function DataExport({ files }: DataExportProps) {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx" | "json">("csv")
  const [includeMetadata, setIncludeMetadata] = useState(false)

  const readyFiles = files.filter((f) => f.status === "ready")

  const handleFileSelection = (fileId: string, checked: boolean) => {
    if (checked) {
      setSelectedFiles((prev) => [...prev, fileId])
    } else {
      setSelectedFiles((prev) => prev.filter((id) => id !== fileId))
    }
  }

  const handleExport = async () => {
    const filesToExport = readyFiles.filter((f) => selectedFiles.includes(f.id))

    for (const file of filesToExport) {
      const data = file.data || []
      let content: string
      let mimeType: string
      let filename: string

      switch (exportFormat) {
        case "csv":
          content = convertToCSV(data, file.columns || [])
          mimeType = "text/csv"
          filename = `${file.name}.csv`
          break
        case "xlsx":
          // In a real implementation, you'd use a library like xlsx
          content = convertToCSV(data, file.columns || [])
          mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          filename = `${file.name}.xlsx`
          break
        case "json":
          content = JSON.stringify(data, null, 2)
          mimeType = "application/json"
          filename = `${file.name}.json`
          break
        default:
          continue
      }

      // Create and trigger download
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const convertToCSV = (data: any[], columns: string[]): string => {
    if (data.length === 0) return ""

    const headers = columns.join(",")
    const rows = data.map((row) =>
      columns
        .map((col) => {
          const value = row[col]
          // Escape commas and quotes
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value ?? ""
        })
        .join(","),
    )

    return [headers, ...rows].join("\n")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2">
          <Download className="w-5 h-5" />
          Export Data
        </CardTitle>
        <CardDescription>Download your transformed data in various formats</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Select Files to Export</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
            {readyFiles.map((file) => (
              <div key={file.id} className="flex items-center space-x-3">
                <Checkbox
                  id={`export-${file.id}`}
                  checked={selectedFiles.includes(file.id)}
                  onCheckedChange={(checked) => handleFileSelection(file.id, checked as boolean)}
                />
                <Label htmlFor={`export-${file.id}`} className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{file.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {file.rows?.toLocaleString()} rows
                    </Badge>
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Export Format */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Export Format</Label>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={exportFormat === "csv" ? "default" : "outline"}
              className="h-auto p-4 justify-start"
              onClick={() => setExportFormat("csv")}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">CSV</div>
                  <div className="text-xs text-muted-foreground">Comma-separated</div>
                </div>
              </div>
            </Button>
            <Button
              variant={exportFormat === "xlsx" ? "default" : "outline"}
              className="h-auto p-4 justify-start"
              onClick={() => setExportFormat("xlsx")}
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Excel</div>
                  <div className="text-xs text-muted-foreground">XLSX format</div>
                </div>
              </div>
            </Button>
            <Button
              variant={exportFormat === "json" ? "default" : "outline"}
              className="h-auto p-4 justify-start"
              onClick={() => setExportFormat("json")}
            >
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">JSON</div>
                  <div className="text-xs text-muted-foreground">Structured data</div>
                </div>
              </div>
            </Button>
          </div>
        </div>

        {/* Export Options */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Export Options</Label>
          <div className="flex items-center space-x-2">
            <Checkbox id="includeMetadata" checked={includeMetadata} onCheckedChange={setIncludeMetadata} />
            <Label htmlFor="includeMetadata" className="text-sm cursor-pointer">
              Include metadata and column information
            </Label>
          </div>
        </div>

        {/* Export Button */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected
          </div>
          <Button onClick={handleExport} disabled={selectedFiles.length === 0} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export {exportFormat.toUpperCase()}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
