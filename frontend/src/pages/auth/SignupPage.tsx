import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Building2, Mail, Lock, User, Globe, Eye, EyeOff } from "lucide-react";
import { authApi, currencyApi } from "../../api";
import { useAuthStore } from "../../store/authStore";
import { Spinner } from "../../components/ui/Common";

export default function SignupPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [form, setForm] = useState({
    name: "", email: "", password: "", companyName: "", country: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch countries from currencies API for dropdown
  const { data: currencies } = useQuery({
    queryKey: ["currencies"],
    queryFn: async () => {
      const res = await currencyApi.getAll();
      return res.data.data;
    },
    staleTime: Infinity,
  });

  // Build unique country list from currencies data
  const countriesFromCurrencies = currencies
    ? [...new Set(currencies.map((c: any) => c.country))].sort()
    : [];

  // Fallback list if API hasn't loaded
  const popularCountries = [
    "India", "United States", "United Kingdom", "Germany", "France",
    "Canada", "Australia", "Japan", "Singapore", "United Arab Emirates",
    "Brazil", "South Africa", "Kenya", "Nigeria", "Indonesia",
  ];

  const countries = countriesFromCurrencies.length > 0 ? countriesFromCurrencies : popularCountries;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (!form.password || form.password.length < 6) e.password = "Password must be at least 6 characters";
    if (!form.companyName.trim()) e.companyName = "Company name is required";
    if (!form.country) e.country = "Please select a country";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authApi.signup(form);
      const { token, user, company } = res.data.data;
      setAuth(token, user, company);
      toast.success(`Welcome, ${user.name}! Your company has been created.`);
      navigate("/dashboard");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Signup failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const set = (field: string, val: string) => {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: "" }));
  };

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-900 via-surface-card to-surface relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 30% 50%, #6366f1 0%, transparent 50%), radial-gradient(circle at 80% 20%, #8b5cf6 0%, transparent 40%)"
        }} />
        <div className="relative z-10 max-w-md">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-primary-600/40">
            <Building2 size={30} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Streamline your <span className="text-gradient">expense management</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Multi-currency support, intelligent approval workflows, and OCR receipt scanning — all in one platform.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { label: "Multi-currency", desc: "Submit in any currency" },
              { label: "Smart Workflows", desc: "Conditional approval rules" },
              { label: "OCR Scanning", desc: "Auto-read receipts" },
              { label: "Role-based Access", desc: "Admin, Manager, Employee" },
            ].map(f => (
              <div key={f.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-white font-medium text-sm">{f.label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-slide-up">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white">Create your account</h2>
            <p className="text-gray-400 mt-2 text-sm">
              Set up your company and start managing expenses
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="label">Your Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  className={`input pl-10 ${errors.name ? "input-error" : ""}`}
                  placeholder="John Doe"
                  value={form.name}
                  onChange={e => set("name", e.target.value)}
                />
              </div>
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="label">Work Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  className={`input pl-10 ${errors.email ? "input-error" : ""}`}
                  placeholder="john@company.com"
                  value={form.email}
                  onChange={e => set("email", e.target.value)}
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPw ? "text" : "password"}
                  className={`input pl-10 pr-10 ${errors.password ? "input-error" : ""}`}
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={e => set("password", e.target.value)}
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Company Name */}
            <div>
              <label className="label">Company Name</label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  className={`input pl-10 ${errors.companyName ? "input-error" : ""}`}
                  placeholder="Acme Corporation"
                  value={form.companyName}
                  onChange={e => set("companyName", e.target.value)}
                />
              </div>
              {errors.companyName && <p className="text-red-400 text-xs mt-1">{errors.companyName}</p>}
            </div>

            {/* Country */}
            <div>
              <label className="label">Country</label>
              <div className="relative">
                <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-10" />
                <select
                  className={`input pl-10 ${errors.country ? "input-error" : ""}`}
                  value={form.country}
                  onChange={e => set("country", e.target.value)}
                >
                  <option value="">Select your country...</option>
                  {countries.map((c: string) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {errors.country && <p className="text-red-400 text-xs mt-1">{errors.country}</p>}
              {form.country && <p className="text-gray-500 text-xs mt-1">Currency will be auto-detected for {form.country}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary btn btn-lg w-full mt-2">
              {loading ? <Spinner size={16} /> : "Create Account & Company"}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
