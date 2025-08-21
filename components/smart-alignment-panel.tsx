"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Brain, Check, X, AlertTriangle, Lightbulb, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { SmartAlignmentEngine, type ColumnMatch, type AlignmentSuggestion } from "@/lib/smart-alignment"
import type { DataFile } from "@/components/file-upload"

interface SmartAlignmentPanelProps {
  sourceFile: DataFile
  targetFile: DataFile
  onAlignmentChange: (matches: { file1: string; file2: string }[]) => void
  initialMatches?: { file1: string; file2: string }[]
}

export function SmartAlignmentPanel({
  sourceFile,
  targetFile,
  onAlignmentChange,
  initialMatches = [],
}: SmartAlignmentPanelProps) {
  const [suggestion, setSuggestion] = useState<AlignmentSuggestion | null>(null)
  const [userMatches, setUserMatches] = useState<{ file1: string; file2: string }[]>(initialMatches)
  const [autoAcceptHighConfidence, setAutoAcceptHighConfidence] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    analyzeSuggestions()
  }, [sourceFile, targetFile])

  const analyzeSuggestions = async () => {
    if (!sourceFile.columns || !targetFile.columns) return

    setIsAnalyzing(true)

    // Simulate analysis delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const alignment = SmartAlignmentEngine.analyzeColumnAlignment(
      sourceFile.columns,
      targetFile.columns,
      sourceFile.data,
      targetFile.data,
    )

    setSuggestion(alignment)

    // Auto-accept high confidence matches if enabled
    if (autoAcceptHighConfidence) {
      const highConfidenceMatches = alignment.matches
        .filter((match) => match.confidence >= 0.9)
        .map((match) => ({ file1: match.sourceColumn, file2: match.targetColumn }))

      setUserMatches((prev) => {
        const existing = prev.filter(
          (um) => !highConfidenceMatches.some((hm) => hm.file1 === um.file1 || hm.file2 === um.file2),
        )
        return [...existing, ...highConfidenceMatches]
      })
    }

    setIsAnalyzing(false)
  }

  const acceptSuggestion = (match: ColumnMatch) => {
    const newMatch = { file1: match.sourceColumn, file2: match.targetColumn }
    setUserMatches((prev) => {
      const filtered = prev.filter((um) => um.file1 !== match.sourceColumn && um.file2 !== match.targetColumn)
      return [...filtered, newMatch]
    })
  }

  const rejectSuggestion = (match: ColumnMatch) => {
    // Just ignore this suggestion - don't add to user matches
  }

  const removeUserMatch = (match: { file1: string; file2: string }) => {
    setUserMatches((prev) => prev.filter((um) => um.file1 !== match.file1 || um.file2 !== match.file2))
  }

  const addManualMatch = (sourceCol: string, targetCol: string) => {
    if (!sourceCol || !targetCol) return

    const newMatch = { file1: sourceCol, file2: targetCol }
    setUserMatches((prev) => {
      const filtered = prev.filter((um) => um.file1 !== sourceCol && um.file2 !== targetCol)
      return [...filtered, newMatch]
    })
  }

  useEffect(() => {
    onAlignmentChange(userMatches)
  }, [userMatches, onAlignmentChange])

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "text-green-600"
    if (confidence >= 0.7) return "text-yellow-600"
    return "text-red-600"
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) return "High"
    if (confidence >= 0.7) return "Medium"
    return "Low"
  }

  const getTypeIcon = (type: ColumnMatch["type"]) => {
    switch (type) {
      case "exact":
        return <Check className="w-4 h-4 text-green-600" />
      case "similar":
        return <Lightbulb className="w-4 h-4 text-blue-600" />
      case "pattern":
        return <Brain className="w-4 h-4 text-purple-600" />
      case "semantic":
        return <AlertTriangle className="w-4 h-4 text-orange-600" />
      default:
        return null
    }
  }

  const availableSourceColumns =
    sourceFile.columns?.filter((col) => !userMatches.some((match) => match.file1 === col)) || []

  const availableTargetColumns =
    targetFile.columns?.filter((col) => !userMatches.some((match) => match.file2 === col)) || []

  const pendingSuggestions =
    suggestion?.matches.filter(
      (match) => !userMatches.some((um) => um.file1 === match.sourceColumn && um.file2 === match.targetColumn),
    ) || []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="font-serif">Smart Column Alignment</CardTitle>
                <CardDescription>AI-powered column matching suggestions</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={autoAcceptHighConfidence} onCheckedChange={setAutoAcceptHighConfidence} />
                <Label className="text-sm">Auto-accept high confidence</Label>
              </div>
              <Button variant="outline" size="sm" onClick={analyzeSuggestions} disabled={isAnalyzing}>
                <RefreshCw className={cn("w-4 h-4 mr-2", isAnalyzing && "animate-spin")} />
                Re-analyze
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Analysis Status */}
          {isAnalyzing ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
                <p className="text-sm text-muted-foreground">Analyzing column relationships...</p>
              </div>
            </div>
          ) : (
            suggestion && (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{suggestion.matches.length}</div>
                  <div className="text-xs text-muted-foreground">Suggested Matches</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{suggestion.unmatchedSource.length}</div>
                  <div className="text-xs text-muted-foreground">Unmatched Source</div>
                </div>
                <div>
                  <div className={cn("text-2xl font-bold", getConfidenceColor(suggestion.confidence))}>
                    {Math.round(suggestion.confidence * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Overall Confidence</div>
                </div>
              </div>
            )
          )}

          <Separator />

          {/* Current Matches */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Confirmed Matches ({userMatches.length})</Label>
            {userMatches.length > 0 ? (
              <ScrollArea className="h-32 border border-border rounded-lg p-4">
                <div className="space-y-2">
                  {userMatches.map((match, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="font-medium">{match.file1}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{match.file2}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUserMatch(match)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">No confirmed matches yet</div>
            )}
          </div>

          {/* Suggestions */}
          {pendingSuggestions.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">AI Suggestions ({pendingSuggestions.length})</Label>
              <ScrollArea className="h-48 border border-border rounded-lg p-4">
                <div className="space-y-3">
                  {pendingSuggestions.map((match, index) => (
                    <div key={index} className="border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {getTypeIcon(match.type)}
                          <span className="font-medium">{match.sourceColumn}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">{match.targetColumn}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getConfidenceColor(match.confidence)}>
                            {getConfidenceBadge(match.confidence)} ({Math.round(match.confidence * 100)}%)
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => acceptSuggestion(match)}
                            className="text-green-600 hover:text-green-600"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rejectSuggestion(match)}
                            className="text-red-600 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">{match.reasons.join(", ")}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Manual Match Addition */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Add Manual Match</Label>
            <div className="flex items-center gap-3">
              <Select
                onValueChange={(value) => {
                  const targetSelect = document.getElementById("target-select") as HTMLSelectElement
                  if (targetSelect?.value) {
                    addManualMatch(value, targetSelect.value)
                    targetSelect.value = ""
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={`Select from ${sourceFile.name}`} />
                </SelectTrigger>
                <SelectContent>
                  {availableSourceColumns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-muted-foreground">→</span>

              <Select
                onValueChange={(value) => {
                  const sourceSelect = document.querySelector("[data-source-select]") as HTMLSelectElement
                  if (sourceSelect?.value) {
                    addManualMatch(sourceSelect.value, value)
                    sourceSelect.value = ""
                  }
                }}
              >
                <SelectTrigger className="flex-1" id="target-select">
                  <SelectValue placeholder={`Select from ${targetFile.name}`} />
                </SelectTrigger>
                <SelectContent>
                  {availableTargetColumns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
