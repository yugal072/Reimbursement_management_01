import type {  ExpenseStatus, Role  } from "../../types";

const statusConfig: Record<ExpenseStatus, { label: string; cls: string }> = {
  DRAFT:    { label: "Draft",    cls: "badge-draft"    },
  PENDING:  { label: "Pending",  cls: "badge-pending"  },
  APPROVED: { label: "Approved", cls: "badge-approved" },
  REJECTED: { label: "Rejected", cls: "badge-rejected" },
};

const roleConfig: Record<Role, { label: string; cls: string }> = {
  ADMIN:    { label: "Admin",    cls: "badge-admin"    },
  MANAGER:  { label: "Manager",  cls: "badge-manager"  },
  EMPLOYEE: { label: "Employee", cls: "badge-employee" },
};

export function StatusBadge({ status }: { status: ExpenseStatus }) {
  const cfg = statusConfig[status] ?? { label: status, cls: "badge-draft" };
  return <span className={cfg.cls}>{cfg.label}</span>;
}

export function RoleBadge({ role }: { role: Role }) {
  const cfg = roleConfig[role] ?? { label: role, cls: "badge-draft" };
  return <span className={cfg.cls}>{cfg.label}</span>;
}

export function RuleTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    ALL:        "badge bg-blue-400/10 text-blue-300 border border-blue-400/20",
    PERCENTAGE: "badge bg-amber-400/10 text-amber-300 border border-amber-400/20",
    SPECIFIC:   "badge bg-violet-400/10 text-violet-300 border border-violet-400/20",
    HYBRID:     "badge bg-rose-400/10 text-rose-300 border border-rose-400/20",
  };
  return <span className={colors[type] ?? "badge-draft"}>{type}</span>;
}
