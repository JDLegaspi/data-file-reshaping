export interface ColumnMatch {
  sourceColumn: string
  targetColumn: string
  confidence: number
  reasons: string[]
  type: "exact" | "similar" | "pattern" | "semantic"
}

export interface AlignmentSuggestion {
  matches: ColumnMatch[]
  unmatchedSource: string[]
  unmatchedTarget: string[]
  confidence: number
}

export class SmartAlignmentEngine {
  private static readonly EXACT_MATCH_THRESHOLD = 1.0
  private static readonly SIMILAR_MATCH_THRESHOLD = 0.8
  private static readonly PATTERN_MATCH_THRESHOLD = 0.6
  private static readonly SEMANTIC_MATCH_THRESHOLD = 0.7

  static analyzeColumnAlignment(
    sourceColumns: string[],
    targetColumns: string[],
    sourceData?: any[],
    targetData?: any[],
  ): AlignmentSuggestion {
    const matches: ColumnMatch[] = []
    const usedTargetColumns = new Set<string>()

    // Phase 1: Exact matches
    for (const sourceCol of sourceColumns) {
      const exactMatch = targetColumns.find(
        (targetCol) =>
          !usedTargetColumns.has(targetCol) &&
          this.normalizeColumnName(sourceCol) === this.normalizeColumnName(targetCol),
      )

      if (exactMatch) {
        matches.push({
          sourceColumn: sourceCol,
          targetColumn: exactMatch,
          confidence: this.EXACT_MATCH_THRESHOLD,
          reasons: ["Exact column name match"],
          type: "exact",
        })
        usedTargetColumns.add(exactMatch)
      }
    }

    // Phase 2: Similar name matches
    const remainingSource = sourceColumns.filter((col) => !matches.find((m) => m.sourceColumn === col))

    for (const sourceCol of remainingSource) {
      let bestMatch: { column: string; score: number; reasons: string[] } | null = null

      for (const targetCol of targetColumns) {
        if (usedTargetColumns.has(targetCol)) continue

        const similarity = this.calculateStringSimilarity(sourceCol, targetCol)
        const reasons: string[] = []

        if (similarity >= this.SIMILAR_MATCH_THRESHOLD) {
          reasons.push(`High name similarity (${Math.round(similarity * 100)}%)`)

          if (!bestMatch || similarity > bestMatch.score) {
            bestMatch = { column: targetCol, score: similarity, reasons }
          }
        }
      }

      if (bestMatch) {
        matches.push({
          sourceColumn: sourceCol,
          targetColumn: bestMatch.column,
          confidence: bestMatch.score,
          reasons: bestMatch.reasons,
          type: "similar",
        })
        usedTargetColumns.add(bestMatch.column)
      }
    }

    // Phase 3: Pattern-based matches
    const stillRemainingSource = sourceColumns.filter((col) => !matches.find((m) => m.sourceColumn === col))

    for (const sourceCol of stillRemainingSource) {
      let bestMatch: { column: string; score: number; reasons: string[] } | null = null

      for (const targetCol of targetColumns) {
        if (usedTargetColumns.has(targetCol)) continue

        const patternScore = this.calculatePatternSimilarity(sourceCol, targetCol, sourceData, targetData)

        if (patternScore.score >= this.PATTERN_MATCH_THRESHOLD) {
          if (!bestMatch || patternScore.score > bestMatch.score) {
            bestMatch = { column: targetCol, score: patternScore.score, reasons: patternScore.reasons }
          }
        }
      }

      if (bestMatch) {
        matches.push({
          sourceColumn: sourceCol,
          targetColumn: bestMatch.column,
          confidence: bestMatch.score,
          reasons: bestMatch.reasons,
          type: "pattern",
        })
        usedTargetColumns.add(bestMatch.column)
      }
    }

    // Phase 4: Semantic matches
    const finalRemainingSource = sourceColumns.filter((col) => !matches.find((m) => m.sourceColumn === col))

    for (const sourceCol of finalRemainingSource) {
      let bestMatch: { column: string; score: number; reasons: string[] } | null = null

      for (const targetCol of targetColumns) {
        if (usedTargetColumns.has(targetCol)) continue

        const semanticScore = this.calculateSemanticSimilarity(sourceCol, targetCol)

        if (semanticScore.score >= this.SEMANTIC_MATCH_THRESHOLD) {
          if (!bestMatch || semanticScore.score > bestMatch.score) {
            bestMatch = { column: targetCol, score: semanticScore.score, reasons: semanticScore.reasons }
          }
        }
      }

      if (bestMatch) {
        matches.push({
          sourceColumn: sourceCol,
          targetColumn: bestMatch.column,
          confidence: bestMatch.score,
          reasons: bestMatch.reasons,
          type: "semantic",
        })
        usedTargetColumns.add(bestMatch.column)
      }
    }

    const unmatchedSource = sourceColumns.filter((col) => !matches.find((m) => m.sourceColumn === col))
    const unmatchedTarget = targetColumns.filter((col) => !usedTargetColumns.has(col))

    const overallConfidence =
      matches.length > 0 ? matches.reduce((sum, match) => sum + match.confidence, 0) / matches.length : 0

    return {
      matches,
      unmatchedSource,
      unmatchedTarget,
      confidence: overallConfidence,
    }
  }

  private static normalizeColumnName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[_\s-]+/g, "")
      .replace(/[^a-z0-9]/g, "")
  }

  private static calculateStringSimilarity(str1: string, str2: string): number {
    const norm1 = this.normalizeColumnName(str1)
    const norm2 = this.normalizeColumnName(str2)

    if (norm1 === norm2) return 1.0

    // Levenshtein distance
    const matrix = Array(norm2.length + 1)
      .fill(null)
      .map(() => Array(norm1.length + 1).fill(null))

    for (let i = 0; i <= norm1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= norm2.length; j++) matrix[j][0] = j

    for (let j = 1; j <= norm2.length; j++) {
      for (let i = 1; i <= norm1.length; i++) {
        const indicator = norm1[i - 1] === norm2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator)
      }
    }

    const maxLength = Math.max(norm1.length, norm2.length)
    return maxLength === 0 ? 1 : 1 - matrix[norm2.length][norm1.length] / maxLength
  }

  private static calculatePatternSimilarity(
    sourceCol: string,
    targetCol: string,
    sourceData?: any[],
    targetData?: any[],
  ): { score: number; reasons: string[] } {
    const reasons: string[] = []
    let score = 0

    if (!sourceData || !targetData) {
      return { score: 0, reasons: [] }
    }

    // Sample data for analysis
    const sourceSample = sourceData
      .slice(0, 100)
      .map((row) => row[sourceCol])
      .filter((v) => v != null)
    const targetSample = targetData
      .slice(0, 100)
      .map((row) => row[targetCol])
      .filter((v) => v != null)

    if (sourceSample.length === 0 || targetSample.length === 0) {
      return { score: 0, reasons: [] }
    }

    // Data type similarity
    const sourceTypes = this.analyzeDataTypes(sourceSample)
    const targetTypes = this.analyzeDataTypes(targetSample)

    const typeOverlap = Object.keys(sourceTypes).filter((type) => targetTypes[type]).length
    const totalTypes = new Set([...Object.keys(sourceTypes), ...Object.keys(targetTypes)]).size

    if (typeOverlap > 0) {
      const typeScore = typeOverlap / totalTypes
      score += typeScore * 0.4
      reasons.push(`Similar data types (${Math.round(typeScore * 100)}% overlap)`)
    }

    // Value pattern similarity
    const sourcePatterns = this.extractValuePatterns(sourceSample)
    const targetPatterns = this.extractValuePatterns(targetSample)

    const patternOverlap = sourcePatterns.filter((p) => targetPatterns.includes(p)).length
    if (patternOverlap > 0) {
      const patternScore = patternOverlap / Math.max(sourcePatterns.length, targetPatterns.length)
      score += patternScore * 0.3
      reasons.push(`Similar value patterns (${patternOverlap} common patterns)`)
    }

    // Unique value overlap
    const sourceUnique = new Set(sourceSample.map((v) => String(v).toLowerCase()))
    const targetUnique = new Set(targetSample.map((v) => String(v).toLowerCase()))
    const intersection = new Set([...sourceUnique].filter((v) => targetUnique.has(v)))

    if (intersection.size > 0) {
      const overlapScore = intersection.size / Math.max(sourceUnique.size, targetUnique.size)
      score += overlapScore * 0.3
      reasons.push(`Common values (${intersection.size} shared values)`)
    }

    return { score: Math.min(score, 1), reasons }
  }

  private static calculateSemanticSimilarity(
    sourceCol: string,
    targetCol: string,
  ): { score: number; reasons: string[] } {
    const reasons: string[] = []
    let score = 0

    // Common semantic groups
    const semanticGroups = {
      id: ["id", "identifier", "key", "pk", "primary", "uid", "uuid"],
      name: ["name", "title", "label", "description", "desc"],
      date: ["date", "time", "timestamp", "created", "updated", "modified"],
      email: ["email", "mail", "address"],
      phone: ["phone", "tel", "telephone", "mobile", "cell"],
      address: ["address", "location", "street", "city", "state", "zip", "postal"],
      amount: ["amount", "price", "cost", "value", "total", "sum"],
      count: ["count", "number", "num", "quantity", "qty"],
      status: ["status", "state", "condition", "flag"],
    }

    const sourceNorm = this.normalizeColumnName(sourceCol)
    const targetNorm = this.normalizeColumnName(targetCol)

    for (const [group, keywords] of Object.entries(semanticGroups)) {
      const sourceMatch = keywords.some((keyword) => sourceNorm.includes(keyword))
      const targetMatch = keywords.some((keyword) => targetNorm.includes(keyword))

      if (sourceMatch && targetMatch) {
        score = 0.8
        reasons.push(`Both columns relate to ${group}`)
        break
      }
    }

    return { score, reasons }
  }

  private static analyzeDataTypes(sample: any[]): Record<string, number> {
    const types: Record<string, number> = {}

    for (const value of sample) {
      let type = "string"

      if (typeof value === "number" || !isNaN(Number(value))) {
        type = "number"
      } else if (typeof value === "boolean" || ["true", "false", "1", "0"].includes(String(value).toLowerCase())) {
        type = "boolean"
      } else if (!isNaN(Date.parse(String(value)))) {
        type = "date"
      }

      types[type] = (types[type] || 0) + 1
    }

    return types
  }

  private static extractValuePatterns(sample: any[]): string[] {
    const patterns: Set<string> = new Set()

    for (const value of sample.slice(0, 20)) {
      const str = String(value)

      // Length patterns
      patterns.add(`length_${str.length}`)

      // Character patterns
      if (/^\d+$/.test(str)) patterns.add("all_digits")
      if (/^[a-zA-Z]+$/.test(str)) patterns.add("all_letters")
      if (/^[a-zA-Z0-9]+$/.test(str)) patterns.add("alphanumeric")
      if (/\s/.test(str)) patterns.add("contains_spaces")
      if (/@/.test(str)) patterns.add("contains_at")
      if (/\d{4}-\d{2}-\d{2}/.test(str)) patterns.add("date_format")
    }

    return Array.from(patterns)
  }
}
