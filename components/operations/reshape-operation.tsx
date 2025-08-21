"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowUpDown, ArrowRightLeft } from "lucide-react"
import type { DataFile } from "@/components/file-upload"

interface ReshapeOperationProps {
  files: DataFile[]
  onExecute: (config: ReshapeConfig) => void
  onCancel: () => void
}

export interface ReshapeConfig {
  sourceFile: string
  operation: "pivot" | "melt"
  // Pivot (wide to long)
  idColumns?: string[]
  valueColumns?: string[]
  variableName?: string
  valueName?: string
  // Melt (long to wide)
  indexColumns?: string[]
  pivotColumn?: string
  valueColumn?: string
  outputName: string
}

export function ReshapeOperation({ files, onExecute, onCancel }: ReshapeOperationProps) {
  const [selectedFile, setSelectedFile] = useState<string>("")
  const [operation, setOperation] = useState<"pivot" | "melt">("melt")

  // Melt (wide to long) configuration
  const [idColumns, setIdColumns] = useState<string[]>([])
  const [valueColumns, setValueColumns] = useState<string[]>([])
  const [variableName, setVariableName] = useState("variable")
  const [valueName, setValueName] = useState("value")

  // Pivot (long to wide) configuration
  const [indexColumns, setIndexColumns] = useState<string[]>([])
  const [pivotColumn, setPivotColumn] = useState<string>("")
  const [valueColumn, setValueColumn] = useState<string>("")

  const [outputName, setOutputName] = useState("reshaped_data")

  const readyFiles = files.filter((f) => f.status === "ready")
  const selectedFileData = readyFiles.find((f) => f.id === selectedFile)

  const handleIdColumnChange = (column: string, checked: boolean) => {
    if (checked) {
      setIdColumns((prev) => [...prev, column])
    } else {
      setIdColumns((prev) => prev.filter((col) => col !== column))
    }
  }

  const handleValueColumnChange = (column: string, checked: boolean) => {
    if (checked) {
      setValueColumns((prev) => [...prev, column])
    } else {
      setValueColumns((prev) => prev.filter((col) => col !== column))
    }
  }

  const handleIndexColumnChange = (column: string, checked: boolean) => {
    if (checked) {
      setIndexColumns((prev) => [...prev, column])
    } else {
      setIndexColumns((prev) => prev.filter((col) => col !== column))
    }
  }

  const canExecute = () => {
    if (!selectedFile || !outputName.trim()) return false

    if (operation === "melt") {
      return valueColumns.length > 0
    } else {
      return pivotColumn && valueColumn && indexColumns.length > 0
    }
  }

  const handleExecute = () => {
    if (!canExecute()) return

    const config: ReshapeConfig = {
      sourceFile: selectedFile,
      operation,
      outputName: outputName.trim(),
      ...(operation === "melt" && {
        idColumns,
        valueColumns,
        variableName,
        valueName,
      }),
      ...(operation === "pivot" && {
        indexColumns,
        pivotColumn,
        valueColumn,
      }),
    }

    onExecute(config)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Reshape Configuration</CardTitle>
          <CardDescription>Transform between wide and long data formats</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select Source File</Label>
            <Select value={selectedFile} onValueChange={setSelectedFile}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a file to reshape" />
              </SelectTrigger>
              <SelectContent>
                {readyFiles.map((file) => (
                  <SelectItem key={file.id} value={file.id}>
                    {file.name} ({file.rows?.toLocaleString()} rows)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operation Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Reshape Operation</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={operation === "melt" ? "default" : "outline"}
                className="h-auto p-4 justify-start"
                onClick={() => setOperation("melt")}
              >
                <div className="flex items-center gap-3">
                  <ArrowUpDown className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">Melt (Wide → Long)</div>
                    <div className="text-xs text-muted-foreground">Convert columns to rows</div>
                  </div>
                </div>
              </Button>
              <Button
                variant={operation === "pivot" ? "default" : "outline"}
                className="h-auto p-4 justify-start"
                onClick={() => setOperation("pivot")}
              >
                <div className="flex items-center gap-3">
                  <ArrowRightLeft className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">Pivot (Long → Wide)</div>
                    <div className="text-xs text-muted-foreground">Convert rows to columns</div>
                  </div>
                </div>
              </Button>
            </div>
          </div>

          {selectedFileData && (
            <>
              {operation === "melt" ? (
                // Melt Configuration
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">ID Columns (Keep as identifiers)</Label>
                    <ScrollArea className="h-32 border border-border rounded-lg p-4">
                      <div className="space-y-2">
                        {selectedFileData.columns?.map((column) => (
                          <div key={column} className="flex items-center space-x-2">
                            <Checkbox
                              id={`id-${column}`}
                              checked={idColumns.includes(column)}
                              onCheckedChange={(checked) => handleIdColumnChange(column, checked as boolean)}
                            />
                            <Label htmlFor={`id-${column}`} className="text-sm cursor-pointer">
                              {column}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Value Columns (Convert to rows)</Label>
                    <ScrollArea className="h-32 border border-border rounded-lg p-4">
                      <div className="space-y-2">
                        {selectedFileData.columns
                          ?.filter((col) => !idColumns.includes(col))
                          .map((column) => (
                            <div key={column} className="flex items-center space-x-2">
                              <Checkbox
                                id={`value-${column}`}
                                checked={valueColumns.includes(column)}
                                onCheckedChange={(checked) => handleValueColumnChange(column, checked as boolean)}
                              />
                              <Label htmlFor={`value-${column}`} className="text-sm cursor-pointer">
                                {column}
                              </Label>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="variableName" className="text-sm font-medium">
                        Variable Column Name
                      </Label>
                      <input
                        id="variableName"
                        type="text"
                        value={variableName}
                        onChange={(e) => setVariableName(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="variable"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valueName" className="text-sm font-medium">
                        Value Column Name
                      </Label>
                      <input
                        id="valueName"
                        type="text"
                        value={valueName}
                        onChange={(e) => setValueName(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="value"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // Pivot Configuration
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Index Columns (Group by these)</Label>
                    <ScrollArea className="h-32 border border-border rounded-lg p-4">
                      <div className="space-y-2">
                        {selectedFileData.columns?.map((column) => (
                          <div key={column} className="flex items-center space-x-2">
                            <Checkbox
                              id={`index-${column}`}
                              checked={indexColumns.includes(column)}
                              onCheckedChange={(checked) => handleIndexColumnChange(column, checked as boolean)}
                            />
                            <Label htmlFor={`index-${column}`} className="text-sm cursor-pointer">
                              {column}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Pivot Column (Becomes new columns)</Label>
                      <Select value={pivotColumn} onValueChange={setPivotColumn}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedFileData.columns
                            ?.filter((col) => !indexColumns.includes(col))
                            .map((col) => (
                              <SelectItem key={col} value={col}>
                                {col}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Value Column (Fill new columns)</Label>
                      <Select value={valueColumn} onValueChange={setValueColumn}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedFileData.columns
                            ?.filter((col) => !indexColumns.includes(col) && col !== pivotColumn)
                            .map((col) => (
                              <SelectItem key={col} value={col}>
                                {col}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </>
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
          <Badge variant="secondary" className="capitalize">
            {operation} operation
          </Badge>
          <Button onClick={handleExecute} disabled={!canExecute()}>
            Execute Reshape
          </Button>
        </div>
      </div>
    </div>
  )
}
