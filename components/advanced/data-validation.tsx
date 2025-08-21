"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react"
import type { DataFile } from "@/components/file-upload"

interface ValidationResult {
  fileId: string
  fileName: string
  issues: ValidationIssue[]
  score: number
  status: "passed" | "warning" | "failed"
}

interface ValidationIssue {
  type: "missing_values" | "duplicate_rows" | "data_type_mismatch" | "outliers" | "inconsistent_format"
  severity: "low" | "medium" | "high"
  column?: string
  count: number
  description: string
  suggestion?: string
}

interface DataValidationProps {
  files: DataFile[]
  onValidationComplete?: (results: ValidationResult[]) => void
}

export function DataValidation({ files, onValidationComplete }: DataValidationProps) {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [validationProgress, setValidationProgress] = useState(0)

  const readyFiles = files.filter((f) => f.status === "ready")

  const validateData = async () => {
    setIsValidating(true)
    setValidationProgress(0)
    const results: ValidationResult[] = []

    for (let i = 0; i < readyFiles.length; i++) {
      const file = readyFiles[i]
      setValidationProgress(((i + 1) / readyFiles.length) * 100)

      // Simulate validation delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      const issues = performValidation(file)
      const score = calculateQualityScore(issues)
      const status = getValidationStatus(score)

      results.push({
        fileId: file.id,
        fileName: file.name,
        issues,
        score,
        status,
      })
    }

    setValidationResults(results)
    setIsValidating(false)
    onValidationComplete?.(results)
  }

  const performValidation = (file: DataFile): ValidationIssue[] => {
    const issues: ValidationIssue[] = []
    const data = file.data || []
    const columns = file.columns || []

    if (data.length === 0) return issues

    // Check for missing values
    columns.forEach((column) => {
      const missingCount = data.filter((row) => row[column] == null || row[column] === "").length
      if (missingCount > 0) {
        issues.push({
          type: "missing_values",
          severity: missingCount > data.length * 0.1 ? "high" : "medium",
          column,
          count: missingCount,
          description: `${missingCount} missing values in column "${column}"`,
          suggestion: "Consider imputation or removal of rows with missing values",
        })
      }
    })

    // Check for duplicate rows (simplified)
    const uniqueRows = new Set(data.map((row) => JSON.stringify(row)))
    const duplicateCount = data.length - uniqueRows.size
    if (duplicateCount > 0) {
      issues.push({
        type: "duplicate_rows",
        severity: duplicateCount > data.length * 0.05 ? "high" : "medium",
        count: duplicateCount,
        description: `${duplicateCount} duplicate rows detected`,
        suggestion: "Remove duplicate rows to improve data quality",
      })
    }

    // Check for data type inconsistencies (simplified)
    columns.forEach((column) => {
      const values = data.map((row) => row[column]).filter((v) => v != null && v !== "")
      if (values.length === 0) return

      const types = new Set(values.map((v) => typeof v))
      if (types.size > 1) {
        issues.push({
          type: "data_type_mismatch",
          severity: "medium",
          column,
          count: values.length,
          description: `Mixed data types in column "${column}"`,
          suggestion: "Standardize data types for consistent analysis",
        })
      }
    })

    return issues
  }

  const calculateQualityScore = (issues: ValidationIssue[]): number => {
    let score = 100
    issues.forEach((issue) => {
      switch (issue.severity) {
        case "high":
          score -= 15
          break
        case "medium":
          score -= 8
          break
        case "low":
          score -= 3
          break
      }
    })
    return Math.max(0, score)
  }

  const getValidationStatus = (score: number): "passed" | "warning" | "failed" => {
    if (score >= 80) return "passed"
    if (score >= 60) return "warning"
    return "failed"
  }

  const getStatusIcon = (status: "passed" | "warning" | "failed") => {
    switch (status) {
      case "passed":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />
    }
  }

  const getSeverityColor = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "low":
        return "bg-blue-100 text-blue-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "high":
        return "bg-red-100 text-red-800"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Data Quality Validation</CardTitle>
          <CardDescription>Analyze your data for common quality issues and inconsistencies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {readyFiles.length} file{readyFiles.length !== 1 ? "s" : ""} ready for validation
            </div>
            <Button
              onClick={validateData}
              disabled={readyFiles.length === 0 || isValidating}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isValidating ? "animate-spin" : ""}`} />
              {isValidating ? "Validating..." : "Run Validation"}
            </Button>
          </div>

          {isValidating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Validating data quality...</span>
                <span>{Math.round(validationProgress)}%</span>
              </div>
              <Progress value={validationProgress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {validationResults.length > 0 && (
        <div className="space-y-4">
          {validationResults.map((result) => (
            <Card key={result.fileId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-serif flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    {result.fileName}
                  </CardTitle>
                  <Badge variant="outline" className="text-sm">
                    Quality Score: {result.score}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.issues.length === 0 ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>No data quality issues detected. Your data looks good!</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {result.issues.map((issue, index) => (
                      <Alert key={index}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge className={getSeverityColor(issue.severity)}>{issue.severity}</Badge>
                                <span className="font-medium">{issue.description}</span>
                              </div>
                              {issue.suggestion && (
                                <div className="text-sm text-muted-foreground">💡 {issue.suggestion}</div>
                              )}
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
