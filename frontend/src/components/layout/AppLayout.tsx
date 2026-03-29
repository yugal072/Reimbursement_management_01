import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import {
  LayoutDashboard, Receipt, CheckSquare, Users, GitBranch,
  LogOut, Building2, ChevronRight, Bell
} from "lucide-react";

export default function AppLayout() {
  const { user, company, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isAdmin = user?.role === "ADMIN";
  const isManagerOrAdmin = user?.role === "MANAGER" || user?.role === "ADMIN";

  const navLinks = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", show: true },
    { to: "/expenses", icon: Receipt, label: "My Expenses", show: true },
    { to: "/approvals", icon: CheckSquare, label: "Approvals", show: isManagerOrAdmin },
    { to: "/admin/users", icon: Users, label: "Users", show: isAdmin },
    { to: "/admin/flows", icon: GitBranch, label: "Approval Flows", show: isAdmin },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-card border-r border-surface-border flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/30">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">{company?.name || "ReimbursePro"}</p>
              <p className="text-gray-500 text-xs">{company?.currencyCode} · {company?.country}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navLinks.filter(l => l.show).map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive ? "sidebar-link-active" : "sidebar-link"
              }
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-surface-border">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-elevated transition-colors cursor-pointer mb-1">
            <div className="w-8 h-8 bg-primary-600/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-400 font-semibold text-xs">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-surface">
        {/* Top header */}
        <header className="sticky top-0 z-10 glass border-b border-surface-border px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Building2 size={13} />
            <ChevronRight size={11} />
            <span className="text-gray-300">{user?.role}</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative w-8 h-8 rounded-lg bg-surface-elevated border border-surface-border flex items-center justify-center hover:border-gray-500 transition-colors">
              <Bell size={15} className="text-gray-400" />
            </button>
          </div>
        </header>

        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
