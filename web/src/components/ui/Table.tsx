"use client";

import { type ReactNode } from "react";

export interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className = "" }: TableProps) {
  return (
    <div className={"overflow-x-auto rounded-[var(--radius-xl)] border border-[var(--card-border)] bg-[var(--surface)] " + className}>
      <table className="w-full border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-[var(--card-border)] bg-[var(--surface-elevated)]">
        {children}
      </tr>
    </thead>
  );
}

function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

function TableRow(props: React.HTMLAttributes<HTMLTableRowElement>) {
  const { className = "", ...rest } = props;
  return (
    <tr
      className={"border-b border-[var(--card-border)] transition-colors last:border-b-0 hover:bg-[var(--surface-hover)] " + className}
      {...rest}
    />
  );
}

function TableHeader(props: React.ThHTMLAttributes<HTMLTableCellElement>) {
  const { className = "", ...rest } = props;
  return (
    <th
      className={"whitespace-nowrap px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--muted-dim)] " + (className || "")}
      {...rest}
    />
  );
}

function TableCell(props: React.TdHTMLAttributes<HTMLTableCellElement>) {
  const { className = "", ...rest } = props;
  return (
    <td
      className={"px-4 py-3 text-[var(--muted)] " + (className || "")}
      {...rest}
    />
  );
}

Table.Head = TableHead;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Header = TableHeader;
Table.Cell = TableCell;
