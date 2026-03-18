/**
 * Convert between visual workflow graph and API format.
 * - Graph is stored in automation.trigger_config._workflow
 * - Steps sent to API are compiled from the graph (linear path: trigger -> actions; email/delay only for current backend)
 */

import type { WorkflowGraph, WorkflowNodeData } from "./workflow-types";

const WORKFLOW_KEY = "_workflow";

export type SerializedWorkflow = { nodes: unknown[]; edges: unknown[] };

export function getWorkflowFromTriggerConfig(trigger_config: Record<string, unknown> | null | undefined): WorkflowGraph | null {
  const w = trigger_config?.[WORKFLOW_KEY];
  if (!w || typeof w !== "object" || !Array.isArray((w as SerializedWorkflow).nodes)) return null;
  const { nodes, edges } = w as SerializedWorkflow;
  return { nodes: nodes as WorkflowGraph["nodes"], edges: edges as WorkflowGraph["edges"] };
}

export function setWorkflowInTriggerConfig(
  trigger_config: Record<string, unknown> | null | undefined,
  workflow: WorkflowGraph
): Record<string, unknown> {
  const out = { ...(trigger_config || {}) };
  (out as Record<string, unknown>)[WORKFLOW_KEY] = { nodes: workflow.nodes, edges: workflow.edges };
  return out;
}

/**
 * Compile graph to linear steps for the API (only email and delay actions; order by following edges from trigger).
 */
export function graphToSteps(workflow: WorkflowGraph): { order: number; step_type: string; payload?: Record<string, unknown> }[] {
  const steps: { order: number; step_type: string; payload?: Record<string, unknown> }[] = [];
  const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]));
  const outEdges = new Map<string, { target: string; sourceHandle?: string | null }[]>();
  for (const e of workflow.edges) {
    const list = outEdges.get(e.source) || [];
    list.push({ target: e.target, sourceHandle: e.sourceHandle ?? undefined });
    outEdges.set(e.source, list);
  }

  const triggerNode = workflow.nodes.find((n) => n.type === "trigger");
  if (!triggerNode) return steps;

  const queue: string[] = [triggerNode.id];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = nodeMap.get(id);
    if (!node) continue;
    if (node.type === "action" && node.data.step_type) {
      if (node.data.step_type === "send_email") {
        steps.push({
          order: steps.length,
          step_type: "email",
          payload: node.data.payload as Record<string, unknown>,
        });
      } else if (node.data.step_type === "delay") {
        steps.push({
          order: steps.length,
          step_type: "delay",
          payload: node.data.payload as Record<string, unknown>,
        });
      }
    }
    const edges = outEdges.get(id);
    if (edges) {
      const yesFirst = [...edges].sort((a, b) => (a.sourceHandle === "yes" ? -1 : b.sourceHandle === "yes" ? 1 : 0));
      for (const { target } of yesFirst) {
        if (!visited.has(target)) queue.push(target);
      }
    }
  }
  return steps;
}

/**
 * Build initial graph from existing automation (trigger + steps).
 */
export function automationToGraph(
  trigger_type: string,
  steps: { order: number; step_type: string; payload?: Record<string, unknown> | null }[]
): WorkflowGraph {
  const nodes: WorkflowGraph["nodes"] = [];
  const edges: WorkflowGraph["edges"] = [];
  const triggerLabel = trigger_type === "subscriber_added" ? "When a subscriber is created" : trigger_type.replace(/_/g, " ");
  nodes.push({
    id: "trigger-1",
    type: "trigger",
    position: { x: 200, y: 0 },
    data: { label: triggerLabel, kind: "trigger", trigger_type: trigger_type as never, payload: { trigger_type } },
  });
  let prevId = "trigger-1";
  let y = 100;
  const stepLabels: Record<string, string> = {
    email: "Send email",
    delay: "Delay",
  };
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const id = `action-${i + 1}`;
    const label = s.step_type === "email" ? (s.payload?.subject as string) || "Send email" : stepLabels[s.step_type] || `Wait ${s.payload?.delay_minutes ?? 0}m`;
    const stepType = s.step_type === "email" ? "send_email" : "delay";
    nodes.push({
      id,
      type: "action",
      position: { x: 200, y },
      data: {
        label,
        kind: "action",
        step_type: stepType as never,
        payload: s.payload || {},
      },
    });
    edges.push({ id: `e-${prevId}-${id}`, source: prevId, target: id });
    prevId = id;
    y += 100;
  }
  return { nodes, edges };
}
