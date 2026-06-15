"use client";

import { memo } from "react";
import { Handle, type NodeProps, Position } from "@xyflow/react";
import type { RuleWorkflowNode } from "../workflow-types";

function RuleNodeComponent(props: NodeProps<RuleWorkflowNode>) {
  const { data, selected } = props;
  return (
    <div
      className={`workflow-node workflow-node-rule min-w-[220px] rounded-2xl border-2 bg-[var(--surface-elevated)] px-4 py-3.5 shadow-sm transition-all duration-200 ${
        selected
          ? "border-[var(--warning)] bg-[var(--surface)] shadow-md ring-2 ring-[var(--warning)]/30"
          : "border-[var(--card-border)] hover:border-[var(--warning)]/50 hover:shadow-md"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--warning)]/25 to-[var(--warning)]/10 text-[var(--warning)]">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--muted-dim)]">Condition</p>
          <p className="truncate text-sm font-medium text-[var(--foreground)]">{data.label || "Choose condition"}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <span className="flex flex-1 items-center justify-center rounded-lg border border-[var(--success)]/40 bg-[var(--success-muted)] py-2 text-xs font-semibold text-[var(--success)]">Yes</span>
        <span className="flex flex-1 items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--card-bg-subtle)] py-2 text-xs font-medium text-[var(--muted)]">No</span>
      </div>
      <Handle type="target" position={Position.Top} className="workflow-handle !-top-[7px] !h-3.5 !w-3.5 !border-2 !border-[var(--warning)] !bg-[var(--surface)]" />
      <Handle type="source" position={Position.Bottom} id="yes" className="workflow-handle !left-[25%] !bottom-[-7px] !h-3.5 !w-3.5 !border-2 !border-[var(--success)] !bg-[var(--surface)]" />
      <Handle type="source" position={Position.Bottom} id="no" className="workflow-handle !left-[75%] !bottom-[-7px] !h-3.5 !w-3.5 !border-2 !border-[var(--muted-dim)] !bg-[var(--surface)]" />
    </div>
  );
}

export const RuleNode = memo(RuleNodeComponent);
