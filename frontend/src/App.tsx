import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/authStore";

import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ExpenseListPage from "./pages/expenses/ExpenseListPage";
import NewExpensePage from "./pages/expenses/NewExpensePage";
import ExpenseDetailPage from "./pages/expenses/ExpenseDetailPage";
import ApprovalsListPage from "./pages/approvals/ApprovalsListPage";
import ApprovalDetailPage from "./pages/approvals/ApprovalDetailPage";
import UsersPage from "./pages/admin/UsersPage";
import FlowsPage from "./pages/admin/FlowsPage";
import FlowBuilderPage from "./pages/admin/FlowBuilderPage";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function App() {
  const { token } = useAuthStore();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1a1d27",
              color: "#f1f5f9",
              border: "1px solid #2d3148",
              borderRadius: "12px",
            },
          }}
        />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="/signup" element={!token ? <SignupPage /> : <Navigate to="/dashboard" replace />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />

              <Route path="/expenses" element={<ExpenseListPage />} />
              <Route path="/expenses/new" element={<NewExpensePage />} />
              <Route path="/expenses/:id" element={<ExpenseDetailPage />} />

              <Route path="/approvals" element={<ApprovalsListPage />} />
              <Route path="/approvals/:id" element={<ApprovalDetailPage />} />

              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/flows" element={<FlowsPage />} />
              <Route path="/admin/flows/new" element={<FlowBuilderPage />} />
              <Route path="/admin/flows/:id/edit" element={<FlowBuilderPage />} />
            </Route>
          </Route>

          {/* Redirect root */}
          <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
