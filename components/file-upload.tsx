"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DataFile {
  id: string
  name: string
  size: number
  type: string
  status: "uploading" | "processing" | "ready" | "error"
  progress: number
  data?: any[]
  columns?: string[]
  rows?: number
  error?: string
}

interface FileUploadProps {
  onFilesChange: (files: DataFile[]) => void
  maxFiles?: number
  maxSize?: number
}

export function FileUpload({ onFilesChange, maxFiles = 10, maxSize = 100 * 1024 * 1024 }: FileUploadProps) {
  const [files, setFiles] = useState<DataFile[]>([])
  const [isDragActive, setIsDragActive] = useState(false)

  const processFile = useCallback(async (file: File): Promise<DataFile> => {
    const dataFile: DataFile = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      status: "uploading",
      progress: 0,
    }

    // Simulate upload progress
    const updateProgress = (progress: number) => {
      setFiles((prev) => prev.map((f) => (f.id === dataFile.id ? { ...f, progress } : f)))
    }

    try {
      // Simulate upload
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 50))
        updateProgress(i)
      }

      // Update status to processing
      setFiles((prev) => prev.map((f) => (f.id === dataFile.id ? { ...f, status: "processing" } : f)))

      // Parse file based on type
      const text = await file.text()
      let data: any[] = []
      let columns: string[] = []

      if (file.name.endsWith(".csv")) {
        const lines = text.split("\n").filter((line) => line.trim())
        if (lines.length > 0) {
          columns = lines[0].split(",").map((col) => col.trim().replace(/"/g, ""))
          data = lines.slice(1).map((line) => {
            const values = line.split(",").map((val) => val.trim().replace(/"/g, ""))
            const row: any = {}
            columns.forEach((col, index) => {
              row[col] = values[index] || ""
            })
            return row
          })
        }
      } else if (file.name.endsWith(".xlsx")) {
        // For demo purposes, simulate Excel parsing
        columns = ["Column A", "Column B", "Column C"]
        data = Array.from({ length: 100 }, (_, i) => ({
          "Column A": `Value A${i + 1}`,
          "Column B": `Value B${i + 1}`,
          "Column C": `Value C${i + 1}`,
        }))
      } else if (file.name.endsWith(".sav")) {
        // For demo purposes, simulate SPSS parsing
        columns = ["Variable 1", "Variable 2", "Variable 3"]
        data = Array.from({ length: 50 }, (_, i) => ({
          "Variable 1": Math.random() * 100,
          "Variable 2": Math.random() * 50,
          "Variable 3": Math.random() * 25,
        }))
      }

      const processedFile: DataFile = {
        ...dataFile,
        status: "ready",
        progress: 100,
        data,
        columns,
        rows: data.length,
      }

      setFiles((prev) => prev.map((f) => (f.id === dataFile.id ? processedFile : f)))

      return processedFile
    } catch (error) {
      const errorFile: DataFile = {
        ...dataFile,
        status: "error",
        error: error instanceof Error ? error.message : "Failed to process file",
      }

      setFiles((prev) => prev.map((f) => (f.id === dataFile.id ? errorFile : f)))

      return errorFile
    }
  }, [])

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setIsDragActive(false)

      // Validate files
      const validFiles = acceptedFiles.filter((file) => {
        const isValidType = file.name.match(/\.(csv|xlsx|sav)$/i)
        const isValidSize = file.size <= maxSize
        return isValidType && isValidSize
      })

      if (validFiles.length !== acceptedFiles.length) {
        // Show error for invalid files
        console.warn("Some files were rejected due to invalid type or size")
      }

      // Add files to state immediately
      const newFiles = validFiles.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        status: "uploading" as const,
        progress: 0,
      }))

      setFiles((prev) => [...prev, ...newFiles])

      // Process files
      const processedFiles = await Promise.all(validFiles.map(processFile))
      onFilesChange([...files, ...processedFiles])
    },
    [files, maxSize, onFilesChange, processFile],
  )

  const {
    getRootProps,
    getInputProps,
    isDragActive: dropzoneActive,
  } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/x-spss-sav": [".sav"],
    },
    maxFiles,
    maxSize,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  })

  const removeFile = (id: string) => {
    const updatedFiles = files.filter((f) => f.id !== id)
    setFiles(updatedFiles)
    onFilesChange(updatedFiles)
  }

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith(".csv")) return "📊"
    if (fileName.endsWith(".xlsx")) return "📈"
    if (fileName.endsWith(".sav")) return "📋"
    return "📄"
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card
        className={cn(
          "border-2 border-dashed transition-all duration-200 cursor-pointer",
          isDragActive || dropzoneActive
            ? "border-accent bg-accent/5 scale-[1.02]"
            : "border-border hover:border-accent/50",
        )}
      >
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          <CardHeader className="text-center pb-4">
            <div
              className={cn(
                "mx-auto w-16 h-16 rounded-lg flex items-center justify-center mb-4 transition-colors",
                isDragActive || dropzoneActive ? "bg-accent/20" : "bg-accent/10",
              )}
            >
              <Upload
                className={cn(
                  "w-8 h-8 transition-colors",
                  isDragActive || dropzoneActive ? "text-accent" : "text-accent/70",
                )}
              />
            </div>
            <CardTitle className="text-xl font-serif">
              {isDragActive || dropzoneActive ? "Drop files here" : "Upload Data Files"}
            </CardTitle>
            <CardDescription className="text-base">
              {isDragActive || dropzoneActive
                ? "Release to upload your files"
                : "Drag and drop your files here or click to browse"}
              <br />
              <span className="text-xs text-muted-foreground mt-2 block">
                Supports .CSV, .XLSX, .SAV files up to {formatFileSize(maxSize)}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button className="w-full bg-transparent" variant="outline" size="lg">
              <FileText className="w-5 h-5 mr-2" />
              Choose Files
            </Button>
          </CardContent>
        </div>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-serif">Uploaded Files</CardTitle>
            <CardDescription>
              {files.length} file{files.length !== 1 ? "s" : ""} uploaded
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-4 p-4 border border-border rounded-lg">
                <div className="text-2xl">{getFileIcon(file.name)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium truncate">{file.name}</p>
                    <Badge
                      variant={
                        file.status === "ready" ? "default" : file.status === "error" ? "destructive" : "secondary"
                      }
                    >
                      {file.status === "uploading" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      {file.status === "ready" && <CheckCircle className="w-3 h-3 mr-1" />}
                      {file.status === "error" && <AlertCircle className="w-3 h-3 mr-1" />}
                      {file.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{formatFileSize(file.size)}</span>
                    {file.rows && <span>{file.rows.toLocaleString()} rows</span>}
                    {file.columns && <span>{file.columns.length} columns</span>}
                  </div>

                  {file.status === "uploading" && <Progress value={file.progress} className="mt-2 h-1" />}

                  {file.error && (
                    <Alert className="mt-2" variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{file.error}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
