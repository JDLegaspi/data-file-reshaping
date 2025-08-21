"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Minus } from "lucide-react"
import type { DataFile } from "@/components/file-upload"

interface AggregateOperationProps {
  files: DataFile[]
  onExecute: (config: AggregateConfig) => void
  onCancel: () => void
}

export interface AggregateConfig {
  sourceFile: string
  groupByColumns: string[]
  aggregations: {
    column: string
    functions: ("count" | "sum" | "mean" | "min" | "max" | "std")[]
  }[]
  outputName: string
}

export function AggregateOperation({ files, onExecute, onCancel }: AggregateOperationProps) {
  const [selectedFile, setSelectedFile] = useState<string>("")
  const [groupByColumns, setGroupByColumns] = useState<string[]>([])
  const [aggregations, setAggregations] = useState<AggregateConfig["aggregations"]>([])
  const [outputName, setOutputName] = useState("aggregated_data")

  const readyFiles = files.filter((f) => f.status === "ready")
  const selectedFileData = readyFiles.find((f) => f.id === selectedFile)

  const handleGroupByChange = (column: string, checked: boolean) => {
    if (checked) {
      setGroupByColumns((prev) => [...prev, column])
    } else {
      setGroupByColumns((prev) => prev.filter((col) => col !== column))
    }
  }

  const addAggregation = () => {
    setAggregations((prev) => [...prev, { column: "", functions: [] }])
  }

  const updateAggregation = (index: number, field: "column", value: string) => {
    setAggregations((prev) => prev.map((agg, i) => (i === index ? { ...agg, [field]: value } : agg)))
  }

  const updateAggregationFunctions = (
    index: number,
    func: AggregateConfig["aggregations"][0]["functions"][0],
    checked: boolean,
  ) => {
    setAggregations((prev) =>
      prev.map((agg, i) => {
        if (i !== index) return agg

        const functions = checked ? [...agg.functions, func] : agg.functions.filter((f) => f !== func)

        return { ...agg, functions }
      }),
    )
  }

  const removeAggregation = (index: number) => {
    setAggregations((prev) => prev.filter((_, i) => i !== index))
  }

  const canExecute = () => {
    return (
      selectedFile &&
      aggregations.length > 0 &&
      aggregations.every((agg) => agg.column && agg.functions.length > 0) &&
      outputName.trim() !== ""
    )
  }

  const handleExecute = () => {
    if (!canExecute()) return

    const config: AggregateConfig = {
      sourceFile: selectedFile,
      groupByColumns,
      aggregations,
      outputName: outputName.trim(),
    }

    onExecute(config)
  }

  const getNumericColumns = () => {
    if (!selectedFileData?.data || !selectedFileData.columns) return []

    return selectedFileData.columns.filter((col) => {
      const values = selectedFileData.data!.slice(0, 100).map((row) => row[col])
      const numericValues = values.filter((v) => !isNaN(Number(v)) && v !== null && v !== "")
      return numericValues.length / values.length > 0.8
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Aggregate Configuration</CardTitle>
          <CardDescription>Group and summarize data points</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select Source File</Label>
            <Select value={selectedFile} onValueChange={setSelectedFile}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a file to aggregate" />
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

          {selectedFileData && (
            <>
              {/* Group By Columns */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Group By Columns (Optional)</Label>
                <ScrollArea className="h-32 border border-border rounded-lg p-4">
                  <div className="space-y-2">
                    {selectedFileData.columns?.map((column) => (
                      <div key={column} className="flex items-center space-x-2">
                        <Checkbox
                          id={`group-${column}`}
                          checked={groupByColumns.includes(column)}
                          onCheckedChange={(checked) => handleGroupByChange(column, checked as boolean)}
                        />
                        <Label htmlFor={`group-${column}`} className="text-sm cursor-pointer">
                          {column}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Aggregations */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Aggregation Functions</Label>
                  <Button variant="outline" size="sm" onClick={addAggregation}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Aggregation
                  </Button>
                </div>

                {aggregations.map((agg, index) => (
                  <div key={index} className="border border-border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Column to Aggregate</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAggregation(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>

                    <Select value={agg.column} onValueChange={(value) => updateAggregation(index, "column", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedFileData.columns?.map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Functions</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["count", "sum", "mean", "min", "max", "std"] as const).map((func) => (
                          <div key={func} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${index}-${func}`}
                              checked={agg.functions.includes(func)}
                              onCheckedChange={(checked) => updateAggregationFunctions(index, func, checked as boolean)}
                              disabled={func !== "count" && !getNumericColumns().includes(agg.column)}
                            />
                            <Label htmlFor={`${index}-${func}`} className="text-sm cursor-pointer capitalize">
                              {func === "std" ? "Standard Deviation" : func}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {aggregations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No aggregations defined</p>
                    <p className="text-xs">Add aggregation functions to summarize your data</p>
                  </div>
                )}
              </div>
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
          {groupByColumns.length > 0 && (
            <Badge variant="secondary">
              Group by {groupByColumns.length} column{groupByColumns.length !== 1 ? "s" : ""}
            </Badge>
          )}
          <Button onClick={handleExecute} disabled={!canExecute()}>
            Execute Aggregation
          </Button>
        </div>
      </div>
    </div>
  )
}
