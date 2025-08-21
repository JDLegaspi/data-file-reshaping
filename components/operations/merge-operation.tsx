"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ArrowDown, ArrowRight, Link, Plus, Brain } from "lucide-react"
import { SmartAlignmentPanel } from "@/components/smart-alignment-panel"
import type { DataFile } from "@/components/file-upload"

interface MergeOperationProps {
  files: DataFile[]
  onExecute: (config: MergeConfig) => void
  onCancel: () => void
}

export interface MergeConfig {
  type: "append" | "join"
  sourceFiles: string[]
  joinType?: "inner" | "left" | "right" | "outer"
  joinColumns?: { file1: string; file2: string }[]
  outputName: string
}

export function MergeOperation({ files, onExecute, onCancel }: MergeOperationProps) {
  const [mergeType, setMergeType] = useState<"append" | "join">("append")
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [joinType, setJoinType] = useState<"inner" | "left" | "right" | "outer">("inner")
  const [joinColumns, setJoinColumns] = useState<{ file1: string; file2: string }[]>([])
  const [outputName, setOutputName] = useState("merged_data")
  const [useSmartAlignment, setUseSmartAlignment] = useState(true)

  const readyFiles = files.filter((f) => f.status === "ready")

  const handleFileSelection = (fileId: string, checked: boolean) => {
    if (checked) {
      setSelectedFiles((prev) => [...prev, fileId])
    } else {
      setSelectedFiles((prev) => prev.filter((id) => id !== fileId))
    }
  }

  const addJoinColumn = () => {
    if (selectedFiles.length >= 2) {
      setJoinColumns((prev) => [...prev, { file1: "", file2: "" }])
    }
  }

  const updateJoinColumn = (index: number, field: "file1" | "file2", value: string) => {
    setJoinColumns((prev) => prev.map((col, i) => (i === index ? { ...col, [field]: value } : col)))
  }

  const removeJoinColumn = (index: number) => {
    setJoinColumns((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSmartAlignmentChange = (matches: { file1: string; file2: string }[]) => {
    setJoinColumns(matches)
  }

  const canExecute = () => {
    if (selectedFiles.length < 2) return false
    if (mergeType === "join" && joinColumns.length === 0) return false
    if (mergeType === "join" && joinColumns.some((col) => !col.file1 || !col.file2)) return false
    return outputName.trim() !== ""
  }

  const handleExecute = () => {
    if (!canExecute()) return

    const config: MergeConfig = {
      type: mergeType,
      sourceFiles: selectedFiles,
      outputName: outputName.trim(),
      ...(mergeType === "join" && {
        joinType,
        joinColumns,
      }),
    }

    onExecute(config)
  }

  const getSelectedFileColumns = (fileId: string) => {
    const file = readyFiles.find((f) => f.id === fileId)
    return file?.columns || []
  }

  const getSelectedFiles = () => {
    return selectedFiles.map((id) => readyFiles.find((f) => f.id === id)).filter(Boolean) as DataFile[]
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Merge & Join Configuration</CardTitle>
          <CardDescription>Combine multiple datasets by rows or columns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Merge Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Operation Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={mergeType === "append" ? "default" : "outline"}
                className="h-auto p-4 justify-start"
                onClick={() => setMergeType("append")}
              >
                <div className="flex items-center gap-3">
                  <ArrowDown className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">Append Rows</div>
                    <div className="text-xs text-muted-foreground">Stack datasets vertically</div>
                  </div>
                </div>
              </Button>
              <Button
                variant={mergeType === "join" ? "default" : "outline"}
                className="h-auto p-4 justify-start"
                onClick={() => setMergeType("join")}
              >
                <div className="flex items-center gap-3">
                  <ArrowRight className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">Join Columns</div>
                    <div className="text-xs text-muted-foreground">Merge datasets horizontally</div>
                  </div>
                </div>
              </Button>
            </div>
          </div>

          {/* File Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select Files to Merge</Label>
            <ScrollArea className="h-48 border border-border rounded-lg p-4">
              <div className="space-y-3">
                {readyFiles.map((file) => (
                  <div key={file.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={file.id}
                      checked={selectedFiles.includes(file.id)}
                      onCheckedChange={(checked) => handleFileSelection(file.id, checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={file.id} className="font-medium cursor-pointer">
                        {file.name}
                      </Label>
                      <div className="text-xs text-muted-foreground">
                        {file.rows?.toLocaleString()} rows × {file.columns?.length} columns
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Join Configuration */}
          {mergeType === "join" && selectedFiles.length >= 2 && (
            <div className="space-y-4">
              <Separator />

              {/* Join Type */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Join Type</Label>
                <Select value={joinType} onValueChange={(value: any) => setJoinType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inner">Inner Join - Keep matching rows only</SelectItem>
                    <SelectItem value="left">Left Join - Keep all rows from first file</SelectItem>
                    <SelectItem value="right">Right Join - Keep all rows from second file</SelectItem>
                    <SelectItem value="outer">Outer Join - Keep all rows from both files</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Smart Alignment Toggle */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="smart-alignment"
                  checked={useSmartAlignment}
                  onCheckedChange={(checked) => setUseSmartAlignment(checked as boolean)}
                />
                <Label htmlFor="smart-alignment" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  Use Smart Column Alignment
                </Label>
              </div>

              {/* Smart Alignment Panel */}
              {useSmartAlignment && selectedFiles.length === 2 && (
                <SmartAlignmentPanel
                  sourceFile={getSelectedFiles()[0]}
                  targetFile={getSelectedFiles()[1]}
                  onAlignmentChange={handleSmartAlignmentChange}
                  initialMatches={joinColumns}
                />
              )}

              {/* Manual Join Columns (fallback) */}
              {!useSmartAlignment && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Join Columns</Label>
                    <Button variant="outline" size="sm" onClick={addJoinColumn}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Column Pair
                    </Button>
                  </div>

                  {joinColumns.map((joinCol, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">
                          {readyFiles.find((f) => f.id === selectedFiles[0])?.name}
                        </Label>
                        <Select
                          value={joinCol.file1}
                          onValueChange={(value) => updateJoinColumn(index, "file1", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            {getSelectedFileColumns(selectedFiles[0]).map((col) => (
                              <SelectItem key={col} value={col}>
                                {col}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Link className="w-4 h-4 text-muted-foreground" />

                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">
                          {readyFiles.find((f) => f.id === selectedFiles[1])?.name}
                        </Label>
                        <Select
                          value={joinCol.file2}
                          onValueChange={(value) => updateJoinColumn(index, "file2", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            {getSelectedFileColumns(selectedFiles[1]).map((col) => (
                              <SelectItem key={col} value={col}>
                                {col}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeJoinColumn(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}

                  {joinColumns.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No join columns defined</p>
                      <p className="text-xs">Add column pairs to specify how files should be joined</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Output Configuration */}
          <div className="space-y-3">
            <Label htmlFor="outputName" className="text-sm font-medium">
              Output Name
            </Label>
            <input
              id="outputName"
              type="text"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Enter output dataset name"
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <div className="flex items-center gap-3">
          {selectedFiles.length > 0 && (
            <Badge variant="secondary">
              {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected
            </Badge>
          )}
          <Button onClick={handleExecute} disabled={!canExecute()}>
            Execute Merge
          </Button>
        </div>
      </div>
    </div>
  )
}
