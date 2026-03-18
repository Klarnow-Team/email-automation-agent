"use client";

import { useCallback, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { workflowNodeTypes } from "./nodes";
import {
  TRIGGERS,
  RULES,
  ACTIONS,
  type WorkflowNodeData,
  type TriggerId,
  type RuleId,
  type ActionId,
} from "./workflow-types";
import {
  getWorkflowFromTriggerConfig,
  setWorkflowInTriggerConfig,
  graphToSteps,
  automationToGraph,
} from "./workflow-serializer";
import { Button, Input } from "@/components/ui";
import type { Automation } from "@/lib/api";

const getId = () => `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

type BuilderProps = {
  automation: Automation | null;
  onSave: (params: {
    name: string;
    trigger_type: string;
    trigger_config: Record<string, unknown>;
    steps: { order: number; step_type: string; payload?: Record<string, unknown> }[];
  }) => Promise<void>;
  onCancel: () => void;
};

function WorkflowBuilderInner({ automation, onSave, onCancel }: BuilderProps) {
  const existingWorkflow = automation
    ? getWorkflowFromTriggerConfig(automation.trigger_config as Record<string, unknown> | null)
    : null;
  const initialGraph = existingWorkflow ?? automationToGraph(
    automation?.trigger_type ?? "subscriber_created",
    automation?.steps ?? []
  );

  const [name, setName] = useState(automation?.name ?? "");
  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes as Node<WorkflowNodeData>[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges as Edge[]);
  const [selectedNode, setSelectedNode] = useState<Node<WorkflowNodeData> | null>(null);
  const [saving, setSaving] = useState(false);

  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (conn: Connection) => setEdges((eds) => addEdge(conn, eds)),
    [setEdges]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/reactflow");
      if (!raw) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      try {
        const { kind, id: typeId, label } = JSON.parse(raw) as { kind: string; id: string; label: string };
        const nodeId = getId();
        const data: WorkflowNodeData = {
          label,
          kind: kind as WorkflowNodeData["kind"],
          payload: {},
        };
        if (kind === "trigger") {
          data.trigger_type = typeId as TriggerId;
        } else if (kind === "rule") {
          data.rule_type = typeId as RuleId;
        } else if (kind === "action") {
          data.step_type = typeId as ActionId;
          if (typeId === "send_email") data.payload = { subject: "", html: "" };
          if (typeId === "delay") data.payload = { delay_minutes: 60 };
        }
        setNodes((nds) => nds.concat({ id: nodeId, type: kind, position, data } as Node<WorkflowNodeData>));
      } catch {
        // ignore invalid drop
      }
    },
    [screenToFlowPosition, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onNodeClick = useCallback((_e: React.MouseEvent, node: Node<WorkflowNodeData>) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);

  const updateNodeData = useCallback(
    (nodeId: string, data: Partial<WorkflowNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
      );
      if (selectedNode?.id === nodeId) {
        setSelectedNode((prev) => (prev ? { ...prev, data: { ...prev.data, ...data } } : null));
      }
    },
    [setNodes, selectedNode]
  );

  const handleSave = useCallback(async () => {
    const workflow: { nodes: Node<WorkflowNodeData>[]; edges: Edge[] } = { nodes, edges };
    const triggerNode = nodes.find((n) => n.type === "trigger");
    const trigger_type = (triggerNode?.data?.trigger_type as string) ?? "subscriber_created";
    const trigger_config = setWorkflowInTriggerConfig(
      automation?.trigger_config as Record<string, unknown> | undefined,
      { nodes: workflow.nodes, edges: workflow.edges }
    );
    const steps = graphToSteps(workflow);
    setSaving(true);
    try {
      await onSave({ name, trigger_type, trigger_config, steps });
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, name, automation?.trigger_config, onSave]);

  const DraggableItem = ({
    kind,
    id,
    label,
  }: {
    kind: "trigger" | "rule" | "action";
    id: string;
    label: string;
  }) => (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/reactflow", JSON.stringify({ kind, id, label }));
        e.dataTransfer.effectAllowed = "move";
      }}
      className="workflow-sidebar-item cursor-grab rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--foreground)] shadow-sm transition-all duration-200 hover:border-[var(--accent)]/50 hover:bg-[var(--surface-hover)] hover:shadow active:cursor-grabbing"
    >
      {label}
    </div>
  );

  return (
    <div className="workflow-builder flex h-[calc(100vh-8rem)] min-h-[500px] gap-0 overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] shadow-lg">
      {/* Sidebar */}
      <aside className="workflow-sidebar flex w-72 shrink-0 flex-col overflow-y-auto border-r border-[var(--card-border)] bg-[var(--surface-elevated)]">
        <div className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-[var(--surface-elevated)] px-5 py-4">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--muted-dim)]">Add to canvas</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">Drag items onto the canvas to build your workflow</p>
        </div>
        <div className="flex flex-col gap-5 p-4">
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-dim)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent)]/15 text-[var(--accent)]">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </span>
              Triggers
            </h3>
            <div className="space-y-2">
              {TRIGGERS.map((t) => (
                <DraggableItem key={t.id} kind="trigger" id={t.id} label={t.label} />
              ))}
            </div>
          </section>
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-dim)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--warning)]/15 text-[var(--warning)]">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </span>
              Conditions
            </h3>
            <div className="space-y-2">
              {RULES.map((r) => (
                <DraggableItem key={r.id} kind="rule" id={r.id} label={r.label} />
              ))}
            </div>
          </section>
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-dim)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--success)]/15 text-[var(--success)]">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </span>
              Actions
            </h3>
            <div className="space-y-2">
              {ACTIONS.map((a) => (
                <DraggableItem key={a.id} kind="action" id={a.id} label={a.label} />
              ))}
            </div>
          </section>
        </div>
      </aside>

      {/* Canvas */}
      <div className="relative flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange as OnNodesChange}
          onEdgesChange={onEdgesChange as OnEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={workflowNodeTypes}
          defaultEdgeOptions={{ type: "smoothstep", style: { stroke: "var(--muted-dim)", strokeWidth: 2 } }}
          nodesDeletable
          edgesDeletable
          deleteKeyCode={["Delete", "Backspace"]}
          fitView
          className="workflow-canvas bg-[var(--background)]"
        >
          <Background gap={20} size={1} color="var(--card-border)" />
          <Controls className="!rounded-xl !border-[var(--card-border)] !bg-[var(--surface-elevated)] !shadow-md" />
          <Panel position="top-left" className="m-4">
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-elevated)] px-4 py-2.5 shadow-sm">
              <label className="mb-1 block text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--muted-dim)]">Automation name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Welcome series"
                className="w-64 rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-dim)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              />
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Config panel */}
      {selectedNode && (
        <aside className="workflow-config flex w-80 shrink-0 flex-col overflow-y-auto border-l border-[var(--card-border)] bg-[var(--surface-elevated)]">
          <div className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-[var(--surface-elevated)] px-5 py-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Configure node</h3>
            <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{selectedNode.data.label}</p>
            <Button
              variant="danger"
              size="sm"
              onClick={deleteSelectedNode}
              className="mt-3 w-full"
            >
              Delete node
            </Button>
          </div>
          <div className="flex-1 p-4">
            {selectedNode.type === "trigger" && (
              <p className="text-sm text-[var(--muted)]">Trigger type is set. Drag a new trigger from the sidebar to replace.</p>
            )}
            {selectedNode.type === "rule" && (
              <div className="space-y-3">
                <Input
                  label="Label"
                  value={selectedNode.data.label}
                  onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                />
              </div>
            )}
            {selectedNode.type === "action" && (
              <div className="space-y-4">
                <Input
                  label="Label"
                  value={selectedNode.data.label}
                  onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                />
                {selectedNode.data.step_type === "send_email" && (
                  <>
                    <Input
                      label="Subject"
                      value={(selectedNode.data.payload?.subject as string) ?? ""}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          payload: { ...selectedNode.data.payload, subject: e.target.value },
                        })
                      }
                    />
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[var(--muted-dim)]">Body (HTML)</label>
                      <textarea
                        value={(selectedNode.data.payload?.html as string) ?? ""}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, {
                            payload: { ...selectedNode.data.payload, html: e.target.value },
                          })
                        }
                        rows={5}
                        className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-dim)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                        placeholder="<p>Hello...</p>"
                      />
                    </div>
                  </>
                )}
                {selectedNode.data.step_type === "delay" && (
                  <Input
                    label="Delay (minutes)"
                    type="number"
                    min={1}
                    value={(selectedNode.data.payload?.delay_minutes as number) ?? 60}
                    onChange={(e) =>
                      updateNodeData(selectedNode.id, {
                        payload: { ...selectedNode.data.payload, delay_minutes: parseInt(e.target.value, 10) || 0 },
                      })
                    }
                  />
                )}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-elevated)] px-5 py-3 shadow-xl">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? "Saving…" : automation ? "Save changes" : "Create automation"}
        </Button>
      </div>
    </div>
  );
}

export function WorkflowBuilder(props: BuilderProps) {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner {...props} />
    </ReactFlowProvider>
  );
}
