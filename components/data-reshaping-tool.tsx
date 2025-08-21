"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Upload,
  Merge,
  BarChart3,
  ArrowUpDown,
  Settings,
  FileText,
  Globe,
  Plus,
  ArrowLeft,
  WorkflowIcon,
  Download,
} from "lucide-react"
import { FileUpload, type DataFile } from "@/components/file-upload"
import { DataPreview } from "@/components/data-preview"
import { WorkflowBuilder } from "@/components/workflow-builder"
import { MergeOperation, type MergeConfig } from "@/components/operations/merge-operation"
import { AggregateOperation, type AggregateConfig } from "@/components/operations/aggregate-operation"
import { ReshapeOperation, type ReshapeConfig } from "@/components/operations/reshape-operation"
import { WorkflowManager, type Workflow } from "@/lib/workflow-manager"
import { DataExport } from "@/components/advanced/data-export"
import { DataValidation } from "@/components/advanced/data-validation"
import { UrlDataSource } from "@/components/advanced/url-data-source"

type ActiveOperation = "merge" | "aggregate" | "reshape" | null

export function DataReshapingTool() {
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<DataFile[]>([])
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<string>()
  const [activeOperation, setActiveOperation] = useState<ActiveOperation>(null)
  const [results, setResults] = useState<DataFile[]>([])
  const [savedWorkflows, setSavedWorkflows] = useState(WorkflowManager.getAllWorkflows())
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingMessage, setProcessingMessage] = useState("")
  const [activeTab, setActiveTab] = useState("workspace")

  const handleFilesChange = (files: DataFile[]) => {
    setUploadedFiles(files)
    const readyFile = files.find((f) => f.status === "ready")
    if (readyFile && !selectedPreviewFile) {
      setSelectedPreviewFile(readyFile.id)
    }
  }

  const handleUrlFileLoaded = (file: DataFile) => {
    setUploadedFiles((prev) => [...prev, file])
    if (!selectedPreviewFile) {
      setSelectedPreviewFile(file.id)
    }
  }

  const handleMergeExecute = async (config: MergeConfig) => {
    console.log("[v0] Executing merge operation:", config)
    setIsProcessing(true)
    setProcessingMessage("Merging datasets...")

    await new Promise((resolve) => setTimeout(resolve, 1500))

    const sourceFiles = uploadedFiles.filter((f) => config.sourceFiles.includes(f.id))
    let mergedData: any[] = []
    let mergedColumns: string[] = []

    if (config.type === "append") {
      mergedColumns = sourceFiles[0]?.columns || []
      mergedData = sourceFiles.reduce((acc, file) => {
        return acc.concat(file.data || [])
      }, [] as any[])
    } else if (config.type === "join" && config.joinColumns) {
      const [file1, file2] = sourceFiles
      mergedColumns = [...(file1.columns || []), ...(file2.columns || [])]
      mergedData = (file1.data || []).slice(0, 100)
    }

    const result: DataFile = {
      id: Math.random().toString(36).substr(2, 9),
      name: config.outputName,
      size: 0,
      type: "application/json",
      status: "ready",
      progress: 100,
      data: mergedData,
      columns: mergedColumns,
      rows: mergedData.length,
    }

    setResults((prev) => [...prev, result])
    setActiveOperation(null)
    setSelectedPreviewFile(result.id)
    setActiveTab("preview")
    setIsProcessing(false)
    setProcessingMessage("")
  }

  const handleAggregateExecute = async (config: AggregateConfig) => {
    console.log("[v0] Executing aggregate operation:", config)
    setIsProcessing(true)
    setProcessingMessage("Aggregating data...")

    await new Promise((resolve) => setTimeout(resolve, 1200))

    const sourceFile = uploadedFiles.find((f) => f.id === config.sourceFile)
    if (!sourceFile?.data) return

    const aggregatedData =
      config.groupByColumns.length > 0
        ? [{ group: "Sample Group", count: sourceFile.rows || 0 }]
        : [{ total_count: sourceFile.rows || 0 }]

    const result: DataFile = {
      id: Math.random().toString(36).substr(2, 9),
      name: config.outputName,
      size: 0,
      type: "application/json",
      status: "ready",
      progress: 100,
      data: aggregatedData,
      columns: Object.keys(aggregatedData[0] || {}),
      rows: aggregatedData.length,
    }

    setResults((prev) => [...prev, result])
    setActiveOperation(null)
    setSelectedPreviewFile(result.id)
    setActiveTab("preview")
    setIsProcessing(false)
    setProcessingMessage("")
  }

  const handleReshapeExecute = async (config: ReshapeConfig) => {
    console.log("[v0] Executing reshape operation:", config)
    setIsProcessing(true)
    setProcessingMessage(
      `${config.operation === "melt" ? "Converting to long format" : "Converting to wide format"}...`,
    )

    await new Promise((resolve) => setTimeout(resolve, 1000))

    const sourceFile = uploadedFiles.find((f) => f.id === config.sourceFile)
    if (!sourceFile?.data || !sourceFile.columns) {
      console.log("[v0] No source file data found")
      return
    }

    let reshapedData: any[] = []
    let reshapedColumns: string[] = []

    if (config.operation === "melt") {
      const idCols = config.idColumns || []
      const valueCols = config.valueColumns || []
      const variableName = config.variableName || "variable"
      const valueName = config.valueName || "value"

      console.log("[v0] Melting data with idCols:", idCols, "valueCols:", valueCols)

      reshapedColumns = [...idCols, variableName, valueName]

      sourceFile.data.forEach((row: any) => {
        valueCols.forEach((valueCol) => {
          const newRow: any = {}

          idCols.forEach((idCol) => {
            newRow[idCol] = row[idCol]
          })

          newRow[variableName] = valueCol
          newRow[valueName] = row[valueCol]

          reshapedData.push(newRow)
        })
      })
    } else if (config.operation === "pivot") {
      const indexCols = config.indexColumns || []
      const pivotCol = config.pivotColumn
      const valueCol = config.valueColumn

      if (!pivotCol || !valueCol) {
        console.log("[v0] Missing pivot or value column")
        return
      }

      console.log("[v0] Pivoting data with indexCols:", indexCols, "pivotCol:", pivotCol, "valueCol:", valueCol)

      const pivotValues = [...new Set(sourceFile.data.map((row: any) => row[pivotCol]))]
      reshapedColumns = [...indexCols, ...pivotValues.map(String)]

      const grouped = new Map<string, any>()

      sourceFile.data.forEach((row: any) => {
        const key = indexCols.map((col) => row[col]).join("|")

        if (!grouped.has(key)) {
          const newRow: any = {}
          indexCols.forEach((col) => {
            newRow[col] = row[col]
          })
          pivotValues.forEach((pVal) => {
            newRow[String(pVal)] = null
          })
          grouped.set(key, newRow)
        }

        const groupedRow = grouped.get(key)!
        groupedRow[String(row[pivotCol])] = row[valueCol]
      })

      reshapedData = Array.from(grouped.values())
    }

    console.log("[v0] Reshape completed. Original rows:", sourceFile.data.length, "New rows:", reshapedData.length)

    const result: DataFile = {
      id: Math.random().toString(36).substr(2, 9),
      name: config.outputName,
      size: 0,
      type: "application/json",
      status: "ready",
      progress: 100,
      data: reshapedData,
      columns: reshapedColumns,
      rows: reshapedData.length,
    }

    setResults((prev) => [...prev, result])
    setActiveOperation(null)
    setSelectedPreviewFile(result.id)
    setActiveTab("preview")
    setIsProcessing(false)
    setProcessingMessage("")
  }

  const handleWorkflowExecute = (workflow: Workflow, workflowResults: DataFile[]) => {
    console.log("[v0] Workflow executed:", workflow.name, workflowResults)
    setResults((prev) => [...prev, ...workflowResults])
    setSavedWorkflows(WorkflowManager.getAllWorkflows())
  }

  const handleDownload = (file: DataFile, format: "csv" | "excel" | "json") => {
    if (!file.data) return

    let content: string
    let mimeType: string
    let filename: string

    switch (format) {
      case "csv":
        const csvHeaders = file.columns?.join(",") || ""
        const csvRows = file.data
          .map((row: any) => file.columns?.map((col) => `"${row[col] || ""}"`).join(",") || "")
          .join("\n")
        content = csvHeaders + "\n" + csvRows
        mimeType = "text/csv"
        filename = `${file.name}.csv`
        break

      case "json":
        content = JSON.stringify(file.data, null, 2)
        mimeType = "application/json"
        filename = `${file.name}.json`
        break

      case "excel":
        const excelHeaders = file.columns?.join(",") || ""
        const excelRows = file.data
          .map((row: any) => file.columns?.map((col) => `"${row[col] || ""}"`).join(",") || "")
          .join("\n")
        content = excelHeaders + "\n" + excelRows
        mimeType = "text/csv"
        filename = `${file.name}.xlsx`
        break

      default:
        return
    }

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

  const allFiles = [...uploadedFiles, ...results]

  return (
    <div className="flex h-screen bg-background">
      {isProcessing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <div>
                <p className="font-medium">{processingMessage}</p>
                <p className="text-sm text-muted-foreground">Please wait...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-72 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <h1 className="text-lg font-sans font-semibold text-sidebar-foreground">DataReshape</h1>
          <p className="text-xs text-sidebar-foreground/60 mt-0.5">Intelligent Data Transformation</p>
        </div>

        <div className="flex-1 p-3 space-y-4 overflow-y-auto">
          <div>
            <h3 className="text-xs font-medium text-sidebar-foreground/70 mb-2 uppercase tracking-wider px-2">
              Data Sources
            </h3>
            <div className="space-y-0.5">
              <Button
                variant="ghost"
                className="w-full justify-start text-xs h-7 px-2 hover:bg-sidebar-accent/50 text-sidebar-foreground/80"
                size="sm"
              >
                <Upload className="w-3.5 h-3.5 mr-2" />
                Upload Files
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-xs h-7 px-2 hover:bg-sidebar-accent/50 text-sidebar-foreground/80"
                size="sm"
              >
                <Globe className="w-3.5 h-3.5 mr-2" />
                From URL
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium text-sidebar-foreground/70 mb-2 uppercase tracking-wider px-2">
              Operations
            </h3>
            <div className="space-y-0.5">
              <Button
                variant="ghost"
                className="w-full justify-start text-xs h-7 px-2 hover:bg-sidebar-accent/50 text-sidebar-foreground/80 disabled:opacity-50"
                size="sm"
                onClick={() => setActiveOperation("merge")}
                disabled={uploadedFiles.filter((f) => f.status === "ready").length < 2}
              >
                <Merge className="w-3.5 h-3.5 mr-2" />
                Merge/Join
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-xs h-7 px-2 hover:bg-sidebar-accent/50 text-sidebar-foreground/80 disabled:opacity-50"
                size="sm"
                onClick={() => setActiveOperation("aggregate")}
                disabled={uploadedFiles.filter((f) => f.status === "ready").length === 0}
              >
                <BarChart3 className="w-3.5 h-3.5 mr-2" />
                Aggregate
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-xs h-7 px-2 hover:bg-sidebar-accent/50 text-sidebar-foreground/80 disabled:opacity-50"
                size="sm"
                onClick={() => setActiveOperation("reshape")}
                disabled={uploadedFiles.filter((f) => f.status === "ready").length === 0}
              >
                <ArrowUpDown className="w-3.5 h-3.5 mr-2" />
                Reshape
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 px-2">
              <h3 className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wider">Workflows</h3>
              <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-sidebar-accent/50">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <div className="space-y-0.5">
              {savedWorkflows.length > 0 ? (
                <div className="space-y-0.5">
                  {savedWorkflows.slice(0, 3).map((workflow) => (
                    <div
                      key={workflow.id}
                      className="text-xs text-sidebar-foreground/70 truncate py-1 px-2 rounded hover:bg-sidebar-accent/30 transition-colors cursor-pointer"
                    >
                      <WorkflowIcon className="w-3 h-3 inline mr-2" />
                      {workflow.name}
                    </div>
                  ))}
                  {savedWorkflows.length > 3 && (
                    <div className="text-xs text-sidebar-foreground/50 px-2 py-1">
                      +{savedWorkflows.length - 3} more workflows
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-sidebar-foreground/50 px-2 py-1">No saved workflows</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="border-b border-border px-4 py-3 bg-card/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeOperation && (
                <Button variant="ghost" size="sm" onClick={() => setActiveOperation(null)} className="h-7 w-7 p-0">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div>
                <h2 className="text-base font-sans font-medium text-foreground">
                  {activeOperation
                    ? `${activeOperation.charAt(0).toUpperCase() + activeOperation.slice(1)} Operation`
                    : "New Transformation"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {activeOperation
                    ? "Configure your data transformation"
                    : allFiles.length > 0
                      ? `${allFiles.length} file${allFiles.length !== 1 ? "s" : ""} loaded`
                      : "Start by uploading your data files or connecting to a data source"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={allFiles.length > 0 ? "default" : "secondary"}
                className="text-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/20"
              >
                {allFiles.length > 0 ? "Files Loaded" : "Ready"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 border-border/50 hover:bg-accent/50 bg-transparent"
              >
                <Settings className="w-3 h-3 mr-1" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4">
          {activeOperation ? (
            <div className="h-full">
              {activeOperation === "merge" && (
                <MergeOperation
                  files={allFiles}
                  onExecute={handleMergeExecute}
                  onCancel={() => setActiveOperation(null)}
                />
              )}
              {activeOperation === "aggregate" && (
                <AggregateOperation
                  files={allFiles}
                  onExecute={handleAggregateExecute}
                  onCancel={() => setActiveOperation(null)}
                />
              )}
              {activeOperation === "reshape" && (
                <ReshapeOperation
                  files={allFiles}
                  onExecute={handleReshapeExecute}
                  onCancel={() => setActiveOperation(null)}
                />
              )}
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="grid w-full grid-cols-6 max-w-2xl h-8 bg-muted/30">
                <TabsTrigger
                  value="workspace"
                  className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Workspace
                </TabsTrigger>
                <TabsTrigger
                  value="workflows"
                  className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Workflows
                </TabsTrigger>
                <TabsTrigger
                  value="preview"
                  className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Preview
                </TabsTrigger>
                <TabsTrigger
                  value="validation"
                  className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Validation
                </TabsTrigger>
                <TabsTrigger
                  value="export"
                  className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Export
                </TabsTrigger>
                <TabsTrigger
                  value="results"
                  className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Results
                </TabsTrigger>
              </TabsList>

              <TabsContent value="workspace" className="mt-4 h-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                  <div className="space-y-4">
                    <FileUpload onFilesChange={handleFilesChange} />
                    <UrlDataSource onFileLoaded={handleUrlFileLoaded} />
                  </div>

                  <Card className="border-border/30 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-sans font-medium">Available Operations</CardTitle>
                      <CardDescription className="text-xs">
                        {uploadedFiles.length > 0
                          ? "Select operations to apply to your data"
                          : "Upload files to enable operations"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-1 gap-2">
                        <Button
                          variant="outline"
                          className="justify-start h-auto p-3 border-border/30 hover:bg-accent/30 hover:border-primary/30 bg-transparent"
                          disabled={uploadedFiles.filter((f) => f.status === "ready").length < 2}
                          onClick={() => setActiveOperation("merge")}
                        >
                          <div className="flex items-start gap-3">
                            <Merge className="w-4 h-4 text-primary mt-0.5" />
                            <div className="text-left">
                              <div className="font-medium text-sm">Merge & Join</div>
                              <div className="text-xs text-muted-foreground">Combine datasets by rows or columns</div>
                            </div>
                          </div>
                        </Button>

                        <Button
                          variant="outline"
                          className="justify-start h-auto p-3 border-border/30 hover:bg-accent/30 hover:border-primary/30 bg-transparent"
                          disabled={uploadedFiles.filter((f) => f.status === "ready").length === 0}
                          onClick={() => setActiveOperation("aggregate")}
                        >
                          <div className="flex items-start gap-3">
                            <BarChart3 className="w-4 h-4 text-primary mt-0.5" />
                            <div className="text-left">
                              <div className="font-medium text-sm">Aggregate</div>
                              <div className="text-xs text-muted-foreground">Group and summarize data points</div>
                            </div>
                          </div>
                        </Button>

                        <Button
                          variant="outline"
                          className="justify-start h-auto p-3 border-border/30 hover:bg-accent/30 hover:border-primary/30 bg-transparent"
                          disabled={uploadedFiles.filter((f) => f.status === "ready").length === 0}
                          onClick={() => setActiveOperation("reshape")}
                        >
                          <div className="flex items-start gap-3">
                            <ArrowUpDown className="w-4 h-4 text-primary mt-0.5" />
                            <div className="text-left">
                              <div className="font-medium text-sm">Reshape</div>
                              <div className="text-xs text-muted-foreground">
                                Transform between wide and long formats
                              </div>
                            </div>
                          </div>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="workflows" className="mt-4 h-full">
                <WorkflowBuilder files={allFiles} onWorkflowExecute={handleWorkflowExecute} />
              </TabsContent>

              <TabsContent value="preview" className="mt-4 h-full">
                <DataPreview
                  files={allFiles}
                  selectedFileId={selectedPreviewFile}
                  onFileSelect={setSelectedPreviewFile}
                />
              </TabsContent>

              <TabsContent value="validation" className="mt-4 h-full">
                <DataValidation files={allFiles} />
              </TabsContent>

              <TabsContent value="export" className="mt-4 h-full">
                <DataExport files={allFiles} />
              </TabsContent>

              <TabsContent value="results" className="mt-4">
                <Card className="h-full border-border/30 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-sans text-sm font-medium">Transformation Results</CardTitle>
                    <CardDescription className="text-xs">
                      {results.length > 0
                        ? `${results.length} result${results.length !== 1 ? "s" : ""} generated`
                        : "View and download your transformed data"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {results.length > 0 ? (
                      <div className="space-y-3">
                        {results.map((result) => (
                          <div
                            key={result.id}
                            className="border border-border/30 rounded-md p-3 hover:bg-accent/20 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-sm">{result.name}</h4>
                              <Badge variant="outline" className="text-xs border-border/50">
                                {result.rows?.toLocaleString()} rows × {result.columns?.length} columns
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-6 border-border/30 hover:bg-accent/30 bg-transparent"
                                onClick={() => handleDownload(result, "csv")}
                              >
                                <Download className="w-3 h-3 mr-1" />
                                CSV
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-6 border-border/30 hover:bg-accent/30 bg-transparent"
                                onClick={() => handleDownload(result, "excel")}
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Excel
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-6 border-border/30 hover:bg-accent/30 bg-transparent"
                                onClick={() => handleDownload(result, "json")}
                              >
                                <Download className="w-3 h-3 mr-1" />
                                JSON
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-6 hover:bg-accent/30"
                                onClick={() => {
                                  setSelectedPreviewFile(result.id)
                                  setActiveTab("preview")
                                }}
                              >
                                Preview
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-muted-foreground">
                        <div className="text-center">
                          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="text-sm">No results yet</p>
                          <p className="text-xs">Complete transformations to see results</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  )
}
