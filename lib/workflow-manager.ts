export interface WorkflowStep {
  id: string
  type: "merge" | "aggregate" | "reshape"
  name: string
  config: any
  inputFiles: string[]
  outputFile: string
  status: "pending" | "running" | "completed" | "error"
  error?: string
  createdAt: Date
}

export interface Workflow {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
  createdAt: Date
  updatedAt: Date
  lastRunAt?: Date
  status: "draft" | "ready" | "running" | "completed" | "error"
}

export class WorkflowManager {
  private static workflows: Map<string, Workflow> = new Map()

  static createWorkflow(name: string, description = ""): Workflow {
    const workflow: Workflow = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      description,
      steps: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "draft",
    }

    this.workflows.set(workflow.id, workflow)
    return workflow
  }

  static getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id)
  }

  static getAllWorkflows(): Workflow[] {
    return Array.from(this.workflows.values()).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  static updateWorkflow(id: string, updates: Partial<Workflow>): Workflow | undefined {
    const workflow = this.workflows.get(id)
    if (!workflow) return undefined

    const updated = {
      ...workflow,
      ...updates,
      updatedAt: new Date(),
    }

    this.workflows.set(id, updated)
    return updated
  }

  static deleteWorkflow(id: string): boolean {
    return this.workflows.delete(id)
  }

  static addStep(
    workflowId: string,
    step: Omit<WorkflowStep, "id" | "status" | "createdAt">,
  ): WorkflowStep | undefined {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) return undefined

    const newStep: WorkflowStep = {
      ...step,
      id: Math.random().toString(36).substr(2, 9),
      status: "pending",
      createdAt: new Date(),
    }

    workflow.steps.push(newStep)
    workflow.updatedAt = new Date()
    workflow.status = "ready"

    this.workflows.set(workflowId, workflow)
    return newStep
  }

  static updateStep(workflowId: string, stepId: string, updates: Partial<WorkflowStep>): WorkflowStep | undefined {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) return undefined

    const stepIndex = workflow.steps.findIndex((s) => s.id === stepId)
    if (stepIndex === -1) return undefined

    workflow.steps[stepIndex] = {
      ...workflow.steps[stepIndex],
      ...updates,
    }

    workflow.updatedAt = new Date()
    this.workflows.set(workflowId, workflow)

    return workflow.steps[stepIndex]
  }

  static removeStep(workflowId: string, stepId: string): boolean {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) return false

    const initialLength = workflow.steps.length
    workflow.steps = workflow.steps.filter((s) => s.id !== stepId)

    if (workflow.steps.length < initialLength) {
      workflow.updatedAt = new Date()
      this.workflows.set(workflowId, workflow)
      return true
    }

    return false
  }

  static async executeWorkflow(
    workflowId: string,
    inputFiles: any[],
    onStepComplete?: (step: WorkflowStep) => void,
  ): Promise<any[]> {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) throw new Error("Workflow not found")

    this.updateWorkflow(workflowId, { status: "running", lastRunAt: new Date() })

    let currentFiles = [...inputFiles]
    const results: any[] = []

    try {
      for (const step of workflow.steps) {
        this.updateStep(workflowId, step.id, { status: "running" })

        // Simulate step execution
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Mock result based on step type
        const mockResult = {
          id: Math.random().toString(36).substr(2, 9),
          name: step.outputFile,
          size: 0,
          type: "application/json",
          status: "ready" as const,
          progress: 100,
          data: currentFiles[0]?.data?.slice(0, 50) || [],
          columns: currentFiles[0]?.columns || [],
          rows: currentFiles[0]?.rows || 0,
        }

        results.push(mockResult)
        currentFiles = [mockResult]

        this.updateStep(workflowId, step.id, { status: "completed" })
        onStepComplete?.(step)
      }

      this.updateWorkflow(workflowId, { status: "completed" })
      return results
    } catch (error) {
      this.updateWorkflow(workflowId, { status: "error" })
      throw error
    }
  }

  static duplicateWorkflow(id: string, newName?: string): Workflow | undefined {
    const original = this.workflows.get(id)
    if (!original) return undefined

    const duplicate: Workflow = {
      ...original,
      id: Math.random().toString(36).substr(2, 9),
      name: newName || `${original.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastRunAt: undefined,
      status: "draft",
      steps: original.steps.map((step) => ({
        ...step,
        id: Math.random().toString(36).substr(2, 9),
        status: "pending" as const,
        createdAt: new Date(),
      })),
    }

    this.workflows.set(duplicate.id, duplicate)
    return duplicate
  }

  static exportWorkflow(id: string): string | undefined {
    const workflow = this.workflows.get(id)
    if (!workflow) return undefined

    return JSON.stringify(workflow, null, 2)
  }

  static importWorkflow(workflowJson: string): Workflow | undefined {
    try {
      const workflow = JSON.parse(workflowJson) as Workflow
      workflow.id = Math.random().toString(36).substr(2, 9)
      workflow.createdAt = new Date()
      workflow.updatedAt = new Date()
      workflow.status = "draft"

      this.workflows.set(workflow.id, workflow)
      return workflow
    } catch {
      return undefined
    }
  }
}
