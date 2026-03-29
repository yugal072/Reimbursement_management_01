import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Receipt, Clock, CheckCircle, XCircle, Users, GitBranch, TrendingUp, Plus, ArrowRight } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { expenseApi, userApi, flowApi } from "../../api";
import type {  Expense  } from "../../types";
import { PageLoader } from "../../components/ui/Common";
import { StatusBadge } from "../../components/ui/Badges";

const STATUS_COLORS: Record<string, string> = {
  PENDING:  "#f59e0b",
  APPROVED: "#10b981",
  REJECTED: "#ef4444",
  DRAFT:    "#6b7280",
};

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div>
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className="text-gray-500 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, company } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const isManager = user?.role === "MANAGER";

  const { data: myExpenses, isLoading: myLoading } = useQuery({
    queryKey: ["my-expenses"],
    queryFn: async () => (await expenseApi.getMine()).data.data as Expense[],
  });

  const { data: allExpenses, isLoading: allLoading } = useQuery({
    queryKey: ["all-expenses"],
    queryFn: async () => (await expenseApi.getAll()).data.data as Expense[],
    enabled: isAdmin,
  });

  const { data: pending } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: async () => (await expenseApi.getPendingApprovals()).data.data as Expense[],
    enabled: isManager || isAdmin,
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await userApi.getAll()).data.data,
    enabled: isAdmin,
  });

  const { data: flows } = useQuery({
    queryKey: ["flows"],
    queryFn: async () => (await flowApi.getAll()).data.data,
    enabled: isAdmin,
  });

  if (myLoading) return <PageLoader />;

  const expenses = isAdmin ? (allExpenses ?? []) : (myExpenses ?? []);

  const statusCounts = expenses.reduce((acc: Record<string, number>, e: Expense) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  const totalConverted = expenses
    .filter(e => e.status === "APPROVED")
    .reduce((sum, e) => sum + (e.convertedAmount ?? 0), 0);

  const recentExpenses = [...expenses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},{" "}
            <span className="text-gradient">{user?.name?.split(" ")[0]}</span> 👋
          </h1>
          <p className="page-subtitle">Here's what's happening at {company?.name}</p>
        </div>
        <Link to="/expenses/new" className="btn-primary btn">
          <Plus size={16} /> New Expense
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Receipt size={20} className="text-primary-400" />}
          label={isAdmin ? "Total Expenses" : "My Expenses"}
          value={expenses.length}
          sub="all time"
          color="bg-primary-500/10"
        />
        <StatCard
          icon={<Clock size={20} className="text-amber-400" />}
          label="Pending"
          value={statusCounts["PENDING"] ?? 0}
          sub="awaiting approval"
          color="bg-amber-500/10"
        />
        <StatCard
          icon={<CheckCircle size={20} className="text-emerald-400" />}
          label="Approved"
          value={statusCounts["APPROVED"] ?? 0}
          sub={`${company?.currencySymbol}${totalConverted.toLocaleString(undefined, { maximumFractionDigits: 0 })} total`}
          color="bg-emerald-500/10"
        />
        {isAdmin ? (
          <StatCard
            icon={<Users size={20} className="text-violet-400" />}
            label="Team Members"
            value={users?.length ?? "—"}
            sub={`${flows?.length ?? 0} flows configured`}
            color="bg-violet-500/10"
          />
        ) : (isManager || isAdmin) ? (
          <StatCard
            icon={<TrendingUp size={20} className="text-rose-400" />}
            label="Needs Your Action"
            value={pending?.length ?? 0}
            sub="pending approvals"
            color="bg-rose-500/10"
          />
        ) : (
          <StatCard
            icon={<XCircle size={20} className="text-red-400" />}
            label="Rejected"
            value={statusCounts["REJECTED"] ?? 0}
            sub="need resubmission"
            color="bg-red-500/10"
          />
        )}
      </div>

      {/* Charts + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Expenses by Status</h2>
          {pieData.length > 0 ? (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={70}
                    paddingAngle={3} dataKey="value">
                    {pieData.map(entry => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#6b7280"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1a1d27", border: "1px solid #2d3148", borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: "#f1f5f9" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-600 text-sm">
              No expenses yet
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {Object.entries(STATUS_COLORS).map(([status, clr]) => (
              <div key={status} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: clr }} />
                {status} ({statusCounts[status] ?? 0})
              </div>
            ))}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300">Recent Expenses</h2>
            <Link to="/expenses" className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {recentExpenses.length === 0 ? (
            <div className="empty-state py-8">
              <Receipt size={32} className="text-gray-700 mb-2" />
              <p className="text-gray-500 text-sm">No expenses yet</p>
              <Link to="/expenses/new" className="btn-primary btn btn-sm mt-3">Submit your first</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentExpenses.map(exp => (
                <Link
                  key={exp.id}
                  to={`/expenses/${exp.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-elevated transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-elevated flex items-center justify-center text-xs font-medium text-gray-400">
                      {exp.category.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">{exp.description}</p>
                      <p className="text-xs text-gray-500">{exp.category} · {new Date(exp.expenseDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">
                        {company?.currencySymbol}{exp.convertedAmount?.toLocaleString() ?? exp.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">{exp.currencyCode}</p>
                    </div>
                    <StatusBadge status={exp.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Admin quick actions */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <Link to="/admin/users" className="card-hover flex items-center gap-4 cursor-pointer">
            <div className="stat-icon bg-violet-500/10">
              <Users size={22} className="text-violet-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Manage Team</p>
              <p className="text-sm text-gray-400">{users?.length ?? 0} members · Add employees & managers</p>
            </div>
            <ArrowRight size={16} className="ml-auto text-gray-600" />
          </Link>
          <Link to="/admin/flows" className="card-hover flex items-center gap-4 cursor-pointer">
            <div className="stat-icon bg-emerald-500/10">
              <GitBranch size={22} className="text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Approval Flows</p>
              <p className="text-sm text-gray-400">{flows?.length ?? 0} flows · Configure approval rules</p>
            </div>
            <ArrowRight size={16} className="ml-auto text-gray-600" />
          </Link>
        </div>
      )}

      {/* Pending approvals for manager */}
      {(isManager || isAdmin) && (pending?.length ?? 0) > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300">Needs Your Approval</h2>
            <Link to="/approvals" className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {pending!.slice(0, 3).map(exp => (
              <Link
                key={exp.id}
                to={`/approvals/${exp.id}`}
                className="card-hover flex items-center justify-between cursor-pointer"
              >
                <div>
                  <p className="font-medium text-white text-sm">{exp.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    by {exp.submittedBy.name} · {exp.category}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">{company?.currencySymbol}{exp.convertedAmount?.toLocaleString()}</p>
                  <span className="badge-pending text-xs">Pending</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
