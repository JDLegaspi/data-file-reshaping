"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  AlertTriangle,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { DataFile } from "@/components/file-upload"

interface DataPreviewProps {
  files: DataFile[]
  selectedFileId?: string
  onFileSelect?: (fileId: string) => void
}

interface ColumnInfo {
  name: string
  type: "string" | "number" | "date" | "boolean"
  nullCount: number
  uniqueCount: number
  sampleValues: any[]
  stats?: {
    min?: number
    max?: number
    mean?: number
    median?: number
  }
}

export function DataPreview({ files, selectedFileId, onFileSelect }: DataPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])

  const readyFiles = files.filter((f) => f.status === "ready")
  const selectedFile = selectedFileId ? readyFiles.find((f) => f.id === selectedFileId) : readyFiles[0]

  // Analyze column information
  const columnInfo = useMemo((): ColumnInfo[] => {
    if (!selectedFile?.data || !selectedFile.columns) return []

    return selectedFile.columns.map((colName) => {
      const values = selectedFile.data!.map((row) => row[colName])
      const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== "")

      // Detect data type
      let type: ColumnInfo["type"] = "string"
      if (nonNullValues.length > 0) {
        const numericValues = nonNullValues.filter((v) => !isNaN(Number(v)))
        const dateValues = nonNullValues.filter((v) => !isNaN(Date.parse(v)))
        const booleanValues = nonNullValues.filter(
          (v) =>
            typeof v === "boolean" ||
            (typeof v === "string" && ["true", "false", "1", "0", "yes", "no"].includes(v.toLowerCase())),
        )

        if (numericValues.length / nonNullValues.length > 0.8) {
          type = "number"
        } else if (dateValues.length / nonNullValues.length > 0.8) {
          type = "date"
        } else if (booleanValues.length / nonNullValues.length > 0.8) {
          type = "boolean"
        }
      }

      // Calculate statistics for numeric columns
      let stats: ColumnInfo["stats"] | undefined
      if (type === "number") {
        const numValues = nonNullValues.map((v) => Number(v)).filter((v) => !isNaN(v))
        if (numValues.length > 0) {
          const sorted = [...numValues].sort((a, b) => a - b)
          stats = {
            min: Math.min(...numValues),
            max: Math.max(...numValues),
            mean: numValues.reduce((a, b) => a + b, 0) / numValues.length,
            median: sorted[Math.floor(sorted.length / 2)],
          }
        }
      }

      return {
        name: colName,
        type,
        nullCount: values.length - nonNullValues.length,
        uniqueCount: new Set(nonNullValues).size,
        sampleValues: nonNullValues.slice(0, 5),
        stats,
      }
    })
  }, [selectedFile])

  // Filter and paginate data
  const filteredData = useMemo(() => {
    if (!selectedFile?.data) return []

    let filtered = selectedFile.data

    if (searchTerm) {
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    return filtered
  }, [selectedFile?.data, searchTerm])

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredData.slice(startIndex, startIndex + pageSize)
  }, [filteredData, currentPage, pageSize])

  const totalPages = Math.ceil(filteredData.length / pageSize)

  const getTypeIcon = (type: ColumnInfo["type"]) => {
    switch (type) {
      case "number":
        return <Hash className="w-4 h-4" />
      case "string":
        return <Type className="w-4 h-4" />
      case "date":
        return <Calendar className="w-4 h-4" />
      case "boolean":
        return <ToggleLeft className="w-4 h-4" />
      default:
        return <Type className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: ColumnInfo["type"]) => {
    switch (type) {
      case "number":
        return "text-blue-600"
      case "string":
        return "text-green-600"
      case "date":
        return "text-purple-600"
      case "boolean":
        return "text-orange-600"
      default:
        return "text-gray-600"
    }
  }

  if (readyFiles.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="font-serif">Data Preview</CardTitle>
          <CardDescription>Preview your data before applying transformations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No data loaded yet</p>
              <p className="text-sm">Upload files to see preview</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* File Selection */}
      {readyFiles.length > 1 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-serif">Select Dataset</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {readyFiles.map((file) => (
                <Button
                  key={file.id}
                  variant={selectedFile?.id === file.id ? "default" : "outline"}
                  className="justify-start h-auto p-4"
                  onClick={() => onFileSelect?.(file.id)}
                >
                  <div className="text-left">
                    <div className="font-medium truncate">{file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {file.rows?.toLocaleString()} rows × {file.columns?.length} columns
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedFile && (
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-serif">{selectedFile.name}</CardTitle>
                <CardDescription>
                  {filteredData.length.toLocaleString()} rows × {selectedFile.columns?.length} columns
                  {searchTerm && ` (filtered from ${selectedFile.rows?.toLocaleString()})`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search data..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col">
            <Tabs defaultValue="data" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="data">Data View</TabsTrigger>
                <TabsTrigger value="columns">Column Info</TabsTrigger>
              </TabsList>

              <TabsContent value="data" className="flex-1 flex flex-col mt-4">
                {/* Data Table */}
                <div className="flex-1 border border-border rounded-lg overflow-hidden">
                  <ScrollArea className="h-full">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          {selectedFile.columns?.map((column) => (
                            <TableHead key={column} className="min-w-32 font-medium">
                              <div className="flex items-center gap-2">
                                {getTypeIcon(columnInfo.find((c) => c.name === column)?.type || "string")}
                                <span className="truncate">{column}</span>
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedData.map((row, index) => (
                          <TableRow key={index}>
                            {selectedFile.columns?.map((column) => (
                              <TableCell key={column} className="max-w-48">
                                <div className="truncate" title={String(row[column])}>
                                  {row[column] === null || row[column] === undefined || row[column] === "" ? (
                                    <span className="text-muted-foreground italic">null</span>
                                  ) : (
                                    String(row[column])
                                  )}
                                </div>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rows per page:</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(value) => {
                        setPageSize(Number(value))
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="200">200</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages} ({filteredData.length.toLocaleString()} rows)
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="columns" className="flex-1 mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                  {columnInfo.map((column) => (
                    <Card key={column.name}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-medium truncate">{column.name}</CardTitle>
                          <Badge variant="outline" className={cn("text-xs", getTypeColor(column.type))}>
                            <span className="mr-1">{getTypeIcon(column.type)}</span>
                            {column.type}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Unique values:</span>
                            <div className="font-medium">{column.uniqueCount.toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Missing values:</span>
                            <div className={cn("font-medium", column.nullCount > 0 && "text-orange-600")}>
                              {column.nullCount.toLocaleString()}
                              {column.nullCount > 0 && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                            </div>
                          </div>
                        </div>

                        {column.stats && (
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">Statistics:</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                Min: <span className="font-medium">{column.stats.min?.toFixed(2)}</span>
                              </div>
                              <div>
                                Max: <span className="font-medium">{column.stats.max?.toFixed(2)}</span>
                              </div>
                              <div>
                                Mean: <span className="font-medium">{column.stats.mean?.toFixed(2)}</span>
                              </div>
                              <div>
                                Median: <span className="font-medium">{column.stats.median?.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Sample values:</div>
                          <div className="flex flex-wrap gap-1">
                            {column.sampleValues.slice(0, 3).map((value, index) => (
                              <Badge key={index} variant="secondary" className="text-xs max-w-24 truncate">
                                {String(value)}
                              </Badge>
                            ))}
                            {column.sampleValues.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{column.sampleValues.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
