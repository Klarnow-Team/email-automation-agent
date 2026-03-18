"use client";

import { memo } from "react";
import { Handle, type NodeProps, Position } from "@xyflow/react";
import type { TriggerWorkflowNode } from "../workflow-types";

function TriggerNodeComponent(props: NodeProps<TriggerWorkflowNode>) {
  const { data, selected } = props;
  return (
    <div
      className={`workflow-node workflow-node-trigger min-w-[220px] rounded-2xl border-2 bg-[var(--surface-elevated)] px-4 py-3.5 shadow-sm transition-all duration-200 ${
        selected
          ? "border-[var(--accent)] bg-[var(--surface)] shadow-md ring-2 ring-[var(--accent)]/30"
          : "border-[var(--card-border)] hover:border-[var(--accent)]/50 hover:shadow-md"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)]/25 to-[var(--accent)]/10 text-[var(--accent)]">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--muted-dim)]">Trigger</p>
          <p className="truncate text-sm font-medium text-[var(--foreground)]">{data.label || "Choose trigger"}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="workflow-handle workflow-handle-source !bottom-[-6px] !h-3.5 !w-3.5 !border-2 !border-[var(--accent)] !bg-[var(--surface)]" />
    </div>
  );
}

export const TriggerNode = memo(TriggerNodeComponent);
