import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Receipt, Search, Filter } from "lucide-react";
import { useState } from "react";
import { expenseApi } from "../../api";
import type {  Expense, ExpenseStatus  } from "../../types";
import { PageLoader } from "../../components/ui/Common";
import { StatusBadge } from "../../components/ui/Badges";
import { useAuthStore } from "../../store/authStore";

const CATEGORIES = ["All", "Meals & Entertainment", "Travel", "Accommodation", "Office Supplies", "Miscellaneous"];
const STATUSES: (ExpenseStatus | "All")[] = ["All", "PENDING", "APPROVED", "REJECTED", "DRAFT"];

export default function ExpenseListPage() {
  const { company } = useAuthStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["my-expenses"],
    queryFn: async () => (await expenseApi.getMine()).data.data as Expense[],
  });

  if (isLoading) return <PageLoader />;

  const filtered = (expenses ?? []).filter(e => {
    const matchSearch = !search ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || e.status === statusFilter;
    const matchCategory = categoryFilter === "All" || e.category === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  });

  const totalApproved = (expenses ?? [])
    .filter(e => e.status === "APPROVED")
    .reduce((s, e) => s + (e.convertedAmount ?? 0), 0);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Expenses</h1>
          <p className="page-subtitle">
            {expenses?.length ?? 0} total · {company?.currencySymbol}
            {totalApproved.toLocaleString(undefined, { maximumFractionDigits: 0 })} approved
          </p>
        </div>
        <Link to="/expenses/new" className="btn-primary btn">
          <Plus size={16} /> Submit Expense
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="input pl-9 h-9 text-xs"
            placeholder="Search expenses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto h-9 text-xs pr-8"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          {STATUSES.map(s => <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>)}
        </select>
        <select
          className="input w-auto h-9 text-xs pr-8"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <Receipt size={40} className="text-gray-700 mb-3" />
          <p className="text-white font-medium">No expenses found</p>
          <p className="text-gray-500 text-sm mt-1">
            {expenses?.length === 0 ? "Submit your first expense to get started" : "Try adjusting your filters"}
          </p>
          <Link to="/expenses/new" className="btn-primary btn btn-sm mt-4">
            <Plus size={14} /> New Expense
          </Link>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Converted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(exp => (
                <tr key={exp.id}>
                  <td>
                    <div>
                      <p className="font-medium text-white">{exp.description}</p>
                      {exp.isApproximateRate && (
                        <p className="text-xs text-amber-500">⚠ Approximate rate</p>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="text-gray-400 text-xs bg-surface-elevated px-2 py-0.5 rounded-md">
                      {exp.category}
                    </span>
                  </td>
                  <td className="text-gray-400">
                    {new Date(exp.expenseDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="font-medium">
                    {exp.amount.toLocaleString()} {exp.currencyCode}
                  </td>
                  <td className="font-semibold text-white">
                    {company?.currencySymbol}{exp.convertedAmount?.toLocaleString() ?? "—"}
                  </td>
                  <td><StatusBadge status={exp.status} /></td>
                  <td>
                    <Link
                      to={`/expenses/${exp.id}`}
                      className="text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
