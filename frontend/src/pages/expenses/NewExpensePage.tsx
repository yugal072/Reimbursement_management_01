import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Upload, Camera, X, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { expenseApi, currencyApi } from "../../api";
import { useAuthStore } from "../../store/authStore";
import { Spinner, PageLoader } from "../../components/ui/Common";
import type {  CurrencyOption  } from "../../types";

const CATEGORIES = [
  "Meals & Entertainment", "Travel", "Accommodation",
  "Office Supplies", "Transportation", "Communication", "Miscellaneous",
];

interface ParsedReceipt {
  amount: number | null;
  expenseDate: Date | null;
  merchantName: string | null;
  category: string;
}

function parseReceiptText(text: string): ParsedReceipt {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const amountMatch = text.match(/(?:total|amount|subtotal|grand total)[:\s]*[$₹€£¥]?\s*([\d,]+\.?\d*)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : null;
  const dateMatch = text.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/);
  const expenseDate = dateMatch ? new Date(dateMatch[1]) : null;
  const merchantName = lines[0] || null;
  let category = "Miscellaneous";
  const lower = text.toLowerCase();
  if (lower.match(/restaurant|food|cafe|dine|meal|pizza|burger|coffee/)) category = "Meals & Entertainment";
  else if (lower.match(/hotel|lodge|inn|accommodation|resort/)) category = "Accommodation";
  else if (lower.match(/taxi|uber|ola|fuel|petrol|diesel|transport|bus|train|flight|airline/)) category = "Travel";
  else if (lower.match(/office|stationery|printer|desk|supply/)) category = "Office Supplies";
  return { amount, expenseDate, merchantName, category };
}

export default function NewExpensePage() {
  const navigate = useNavigate();
  const { company } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    amount: "", currencyCode: company?.currencyCode ?? "USD",
    category: "", description: "", expenseDate: new Date().toISOString().split("T")[0],
  });
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [ocring, setOcring] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: currencies, isLoading: currLoading } = useQuery({
    queryKey: ["currencies"],
    queryFn: async () => (await currencyApi.getAll()).data.data as CurrencyOption[],
    staleTime: Infinity,
  });

  const handleFile = useCallback(async (file: File) => {
    setReceipt(file);
    const url = URL.createObjectURL(file);
    setReceiptPreview(url);

    // Run Tesseract OCR
    if (file.type.startsWith("image/")) {
      setOcring(true);
      try {
        const Tesseract = await import("tesseract.js");
        const { data: { text } } = await Tesseract.recognize(file, "eng");
        const parsed = parseReceiptText(text);
        toast.success("Receipt scanned! Fields auto-filled.");
        setForm(f => ({
          ...f,
          ...(parsed.amount ? { amount: String(parsed.amount) } : {}),
          ...(parsed.category !== "Miscellaneous" ? { category: parsed.category } : {}),
          ...(parsed.merchantName ? { description: parsed.merchantName } : {}),
          ...(parsed.expenseDate && !isNaN(parsed.expenseDate.getTime())
            ? { expenseDate: parsed.expenseDate.toISOString().split("T")[0] } : {}),
        }));
      } catch {
        toast.error("OCR failed — please fill fields manually");
      } finally {
        setOcring(false);
      }
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) e.amount = "Valid amount required";
    if (!form.currencyCode) e.currencyCode = "Currency required";
    if (!form.category) e.category = "Category required";
    if (!form.description.trim()) e.description = "Description required";
    if (!form.expenseDate) e.expenseDate = "Expense date required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (receipt) fd.append("receipt", receipt);
      await expenseApi.submit(fd);
      toast.success("Expense submitted successfully!");
      navigate("/expenses");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field: string, val: string) => {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: "" }));
  };

  if (currLoading) return <PageLoader />;

  const selectedCurrency = currencies?.find(c => c.code === form.currencyCode);
  const isForeign = form.currencyCode !== company?.currencyCode;

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">New Expense</h1>
          <p className="page-subtitle">Upload a receipt for auto-fill, or enter details manually</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Receipt Upload / OCR */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-primary-400" />
            <h2 className="text-sm font-semibold text-gray-200">Receipt Scanner (OCR)</h2>
            <span className="badge bg-primary-400/10 text-primary-400 border border-primary-400/20 text-xs">Auto-fill</span>
          </div>

          {receiptPreview ? (
            <div className="relative">
              <img src={receiptPreview} alt="Receipt" className="w-full max-h-48 object-contain rounded-xl bg-surface-elevated" />
              <button
                type="button"
                onClick={() => { setReceipt(null); setReceiptPreview(null); }}
                className="absolute top-2 right-2 w-7 h-7 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
              >
                <X size={13} className="text-white" />
              </button>
              {ocring && (
                <div className="absolute inset-0 bg-surface-card/80 rounded-xl flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin text-primary-400" />
                  <span className="text-sm text-gray-300">Reading receipt...</span>
                </div>
              )}
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-surface-border rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary-500/50 hover:bg-primary-500/5 transition-all"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
            >
              <div className="w-12 h-12 rounded-xl bg-surface-elevated flex items-center justify-center">
                <Camera size={22} className="text-gray-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-300">Drop receipt image or click to upload</p>
                <p className="text-xs text-gray-600 mt-0.5">PNG, JPG, WebP · Max 10MB · Auto-fills form fields</p>
              </div>
              <button type="button" className="btn-ghost btn btn-sm">
                <Upload size={13} /> Choose File
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>

        {/* Expense Details */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-200">Expense Details</h2>

          {/* Amount + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount *</label>
              <input
                type="number" step="0.01" min="0"
                className={`input ${errors.amount ? "input-error" : ""}`}
                placeholder="0.00"
                value={form.amount}
                onChange={e => set("amount", e.target.value)}
              />
              {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount}</p>}
            </div>
            <div>
              <label className="label">Currency *</label>
              <select
                className={`input ${errors.currencyCode ? "input-error" : ""}`}
                value={form.currencyCode}
                onChange={e => set("currencyCode", e.target.value)}
              >
                {currencies?.map(c => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {isForeign && form.amount && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary-500/10 border border-primary-500/20 text-xs text-primary-300">
              <AlertCircle size={13} />
              Will be converted to {company?.currencyCode} at current exchange rate on submission
            </div>
          )}

          {/* Category */}
          <div>
            <label className="label">Category *</label>
            <select
              className={`input ${errors.category ? "input-error" : ""}`}
              value={form.category}
              onChange={e => set("category", e.target.value)}
            >
              <option value="">Select a category...</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="label">Description *</label>
            <textarea
              className={`input resize-none ${errors.description ? "input-error" : ""}`}
              rows={2}
              placeholder="e.g. Team lunch at Olive Garden"
              value={form.description}
              onChange={e => set("description", e.target.value)}
            />
            {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
          </div>

          {/* Expense Date */}
          <div>
            <label className="label">Expense Date *</label>
            <input
              type="date"
              className={`input ${errors.expenseDate ? "input-error" : ""}`}
              value={form.expenseDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={e => set("expenseDate", e.target.value)}
            />
            {errors.expenseDate && <p className="text-red-400 text-xs mt-1">{errors.expenseDate}</p>}
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost btn flex-1">
            Cancel
          </button>
          <button type="submit" disabled={submitting || ocring} className="btn-primary btn flex-1">
            {submitting ? <Spinner size={16} /> : "Submit Expense"}
          </button>
        </div>
      </form>
    </div>
  );
}
