"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Play,
  Plus,
  Trash2,
  Edit,
  Copy,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  WorkflowIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { WorkflowManager, type Workflow, type WorkflowStep } from "@/lib/workflow-manager"
import type { DataFile } from "@/components/file-upload"

interface WorkflowBuilderProps {
  files: DataFile[]
  onWorkflowExecute: (workflow: Workflow, results: DataFile[]) => void
}

export function WorkflowBuilder({ files, onWorkflowExecute }: WorkflowBuilderProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executingStep, setExecutingStep] = useState<string | null>(null)
  const [newWorkflowName, setNewWorkflowName] = useState("")
  const [newWorkflowDescription, setNewWorkflowDescription] = useState("")

  useEffect(() => {
    setWorkflows(WorkflowManager.getAllWorkflows())
  }, [])

  const refreshWorkflows = () => {
    setWorkflows(WorkflowManager.getAllWorkflows())
  }

  const createWorkflow = () => {
    if (!newWorkflowName.trim()) return

    const workflow = WorkflowManager.createWorkflow(newWorkflowName.trim(), newWorkflowDescription.trim())
    setNewWorkflowName("")
    setNewWorkflowDescription("")
    setIsCreating(false)
    refreshWorkflows()
    setSelectedWorkflow(workflow)
  }

  const deleteWorkflow = (id: string) => {
    WorkflowManager.deleteWorkflow(id)
    if (selectedWorkflow?.id === id) {
      setSelectedWorkflow(null)
    }
    refreshWorkflows()
  }

  const duplicateWorkflow = (id: string) => {
    const duplicate = WorkflowManager.duplicateWorkflow(id)
    if (duplicate) {
      refreshWorkflows()
      setSelectedWorkflow(duplicate)
    }
  }

  const addStep = (type: "merge" | "aggregate" | "reshape") => {
    if (!selectedWorkflow) return

    const step = WorkflowManager.addStep(selectedWorkflow.id, {
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Step`,
      config: {},
      inputFiles: [],
      outputFile: `${type}_output_${selectedWorkflow.steps.length + 1}`,
    })

    if (step) {
      refreshWorkflows()
      setSelectedWorkflow(WorkflowManager.getWorkflow(selectedWorkflow.id) || null)
    }
  }

  const removeStep = (stepId: string) => {
    if (!selectedWorkflow) return

    WorkflowManager.removeStep(selectedWorkflow.id, stepId)
    refreshWorkflows()
    setSelectedWorkflow(WorkflowManager.getWorkflow(selectedWorkflow.id) || null)
  }

  const executeWorkflow = async () => {
    if (!selectedWorkflow || files.length === 0) return

    setIsExecuting(true)
    setExecutingStep(null)

    try {
      const results = await WorkflowManager.executeWorkflow(
        selectedWorkflow.id,
        files.filter((f) => f.status === "ready"),
        (step) => {
          setExecutingStep(step.id)
        },
      )

      onWorkflowExecute(selectedWorkflow, results)
      refreshWorkflows()
      setSelectedWorkflow(WorkflowManager.getWorkflow(selectedWorkflow.id) || null)
    } catch (error) {
      console.error("Workflow execution failed:", error)
    } finally {
      setIsExecuting(false)
      setExecutingStep(null)
    }
  }

  const getStatusIcon = (status: WorkflowStep["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-muted-foreground" />
      case "running":
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "error":
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: Workflow["status"]) => {
    switch (status) {
      case "draft":
        return "text-muted-foreground"
      case "ready":
        return "text-blue-600"
      case "running":
        return "text-orange-600"
      case "completed":
        return "text-green-600"
      case "error":
        return "text-red-600"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Workflow List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-serif">Saved Workflows</CardTitle>
              <CardDescription>Manage and execute your data transformation workflows</CardDescription>
            </div>
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  New Workflow
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Workflow</DialogTitle>
                  <DialogDescription>Define a new data transformation workflow</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="workflow-name">Workflow Name</Label>
                    <Input
                      id="workflow-name"
                      value={newWorkflowName}
                      onChange={(e) => setNewWorkflowName(e.target.value)}
                      placeholder="Enter workflow name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workflow-description">Description (Optional)</Label>
                    <Textarea
                      id="workflow-description"
                      value={newWorkflowDescription}
                      onChange={(e) => setNewWorkflowDescription(e.target.value)}
                      placeholder="Describe what this workflow does"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreating(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createWorkflow} disabled={!newWorkflowName.trim()}>
                      Create Workflow
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {workflows.length > 0 ? (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className={cn(
                      "border border-border rounded-lg p-4 cursor-pointer transition-colors",
                      selectedWorkflow?.id === workflow.id ? "bg-accent" : "hover:bg-muted/50",
                    )}
                    onClick={() => setSelectedWorkflow(workflow)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{workflow.name}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getStatusColor(workflow.status)}>
                          {workflow.status}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              duplicateWorkflow(workflow.id)
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteWorkflow(workflow.id)
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{workflow.description || "No description"}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {workflow.steps.length} step{workflow.steps.length !== 1 ? "s" : ""}
                      </span>
                      <span>Updated {workflow.updatedAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <WorkflowIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No workflows created yet</p>
              <p className="text-sm">Create your first workflow to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workflow Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-serif">
                {selectedWorkflow ? selectedWorkflow.name : "Workflow Editor"}
              </CardTitle>
              <CardDescription>
                {selectedWorkflow
                  ? "Configure and execute your workflow steps"
                  : "Select a workflow to edit or create a new one"}
              </CardDescription>
            </div>
            {selectedWorkflow && (
              <Button
                onClick={executeWorkflow}
                disabled={isExecuting || selectedWorkflow.steps.length === 0 || files.length === 0}
              >
                {isExecuting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Execute
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selectedWorkflow ? (
            <div className="space-y-6">
              {/* Workflow Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getStatusColor(selectedWorkflow.status)}>
                    {selectedWorkflow.status}
                  </Badge>
                  {selectedWorkflow.lastRunAt && (
                    <span className="text-sm text-muted-foreground">
                      Last run: {selectedWorkflow.lastRunAt.toLocaleString()}
                    </span>
                  )}
                </div>
                {selectedWorkflow.description && (
                  <p className="text-sm text-muted-foreground">{selectedWorkflow.description}</p>
                )}
              </div>

              <Separator />

              {/* Steps */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Workflow Steps</Label>
                  <Select onValueChange={(value: "merge" | "aggregate" | "reshape") => addStep(value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Add step" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="merge">Merge/Join</SelectItem>
                      <SelectItem value="aggregate">Aggregate</SelectItem>
                      <SelectItem value="reshape">Reshape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedWorkflow.steps.length > 0 ? (
                  <div className="space-y-3">
                    {selectedWorkflow.steps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1 border border-border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(step.status)}
                              <span className="font-medium">{step.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {step.type}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeStep(step.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Output: {step.outputFile}
                            {step.error && <div className="text-red-600 mt-1">Error: {step.error}</div>}
                          </div>
                        </div>
                        {index < selectedWorkflow.steps.length - 1 && (
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No steps added yet</p>
                    <p className="text-sm">Add steps to build your workflow</p>
                  </div>
                )}
              </div>

              {/* Execution Info */}
              {isExecuting && (
                <div className="border border-border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="font-medium">Executing Workflow</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {executingStep
                      ? `Running step: ${selectedWorkflow.steps.find((s) => s.id === executingStep)?.name}`
                      : "Preparing to execute..."}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Edit className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a workflow to edit</p>
              <p className="text-sm">Choose from the list or create a new workflow</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
