// Shared TypeScript types for the entire application

export type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";
export type ExpenseStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
export type RuleType = "ALL" | "PERCENTAGE" | "SPECIFIC" | "HYBRID";
export type ActionType = "APPROVED" | "REJECTED";

export interface Company {
  id: string;
  name: string;
  country: string;
  currencyCode: string;
  currencySymbol: string;
  createdAt: string;
}

export interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: Role;
  managerId: string | null;
  isManagerApprover: boolean;
  createdAt: string;
  company?: Company;
  manager?: Pick<User, "id" | "name" | "email"> | null;
}

export interface StepApprover {
  id: string;
  stepId: string;
  userId: string;
  user: Pick<User, "id" | "name" | "email">;
}

export interface ApprovalFlowStep {
  id: string;
  flowId: string;
  stepIndex: number;
  label: string;
  ruleType: RuleType;
  percentageThreshold: number | null;
  keyApproverId: string | null;
  keyApprover: Pick<User, "id" | "name" | "email"> | null;
  stepApprovers: StepApprover[];
}

export interface ApprovalFlow {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  steps: ApprovalFlowStep[];
  _count?: { expenses: number };
}

export interface ApprovalAction {
  id: string;
  expenseId: string;
  stepId: string | null;
  actorId: string;
  action: ActionType;
  comment: string | null;
  isManagerGate: boolean;
  createdAt: string;
  actor: Pick<User, "id" | "name" | "email" | "role">;
  step: ApprovalFlowStep | null;
}

export interface Expense {
  id: string;
  companyId: string;
  submittedById: string;
  amount: number;
  currencyCode: string;
  convertedAmount: number | null;
  category: string;
  description: string;
  expenseDate: string;
  receiptUrl: string | null;
  status: ExpenseStatus;
  currentStepIndex: number;
  activeFlowId: string | null;
  isApproximateRate: boolean;
  managerApproved: boolean | null;
  createdAt: string;
  updatedAt: string;
  submittedBy: Pick<User, "id" | "name" | "email" | "role">;
  company: Pick<Company, "id" | "name" | "currencyCode" | "currencySymbol">;
  activeFlow: ApprovalFlow | null;
  approvalActions: ApprovalAction[];
}

export interface AuthState {
  token: string | null;
  user: User | null;
  company: Company | null;
}

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  country: string;
}

// Form types
export interface SignupForm {
  name: string;
  email: string;
  password: string;
  companyName: string;
  country: string;
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface ExpenseForm {
  amount: string;
  currencyCode: string;
  category: string;
  description: string;
  expenseDate: string;
  receipt?: File;
}

export interface CreateUserForm {
  name: string;
  email: string;
  password: string;
  role: "EMPLOYEE" | "MANAGER";
  managerId?: string;
  isManagerApprover: boolean;
}

export interface FlowStepForm {
  stepIndex: number;
  label: string;
  ruleType: RuleType;
  percentageThreshold?: number;
  keyApproverId?: string;
  approverIds: string[];
}

export interface CreateFlowForm {
  name: string;
  description?: string;
  isDefault: boolean;
  steps: FlowStepForm[];
}
