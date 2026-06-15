"use client";

import { memo } from "react";
import { Handle, type NodeProps, Position } from "@xyflow/react";
import type { ActionWorkflowNode } from "../workflow-types";

function ActionNodeComponent(props: NodeProps<ActionWorkflowNode>) {
  const { data, selected } = props;
  const isEnd = data.step_type === "end_workflow";
  return (
    <div
      className={`workflow-node workflow-node-action min-w-[220px] rounded-2xl border-2 bg-[var(--surface-elevated)] px-4 py-3.5 shadow-sm transition-all duration-200 ${
        selected
          ? "border-[var(--success)] bg-[var(--surface)] shadow-md ring-2 ring-[var(--success)]/30"
          : "border-[var(--card-border)] hover:border-[var(--success)]/50 hover:shadow-md"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--success)]/25 to-[var(--success)]/10 text-[var(--success)]" aria-hidden>
          {isEnd ? (
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--muted-dim)]">Action</p>
          <p className="truncate text-sm font-medium text-[var(--foreground)]">{data.label || "Choose action"}</p>
        </div>
      </div>
      {!isEnd && (
        <Handle type="source" position={Position.Bottom} className="workflow-handle workflow-handle-source !bottom-[-6px] !h-3.5 !w-3.5 !border-2 !border-[var(--success)] !bg-[var(--surface)]" />
      )}
      <Handle type="target" position={Position.Top} className="workflow-handle !-top-[7px] !h-3.5 !w-3.5 !border-2 !border-[var(--card-border)] !bg-[var(--surface)]" />
    </div>
  );
}

export const ActionNode = memo(ActionNodeComponent);
