import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Trash2, ChevronUp, ChevronDown, ArrowLeft, Info } from "lucide-react";
import { flowApi, userApi } from "../../api";
import type {  FlowStepForm, RuleType, User  } from "../../types";
import { PageLoader, Spinner } from "../../components/ui/Common";
import { RuleTypeBadge } from "../../components/ui/Badges";

const BLANK_STEP: FlowStepForm = {
  stepIndex: 0, label: "", ruleType: "ALL",
  percentageThreshold: undefined, keyApproverId: undefined, approverIds: [],
};

const RULE_DESCRIPTIONS: Record<RuleType, string> = {
  ALL: "All assigned approvers must approve",
  PERCENTAGE: "A set percentage of approvers must approve",
  SPECIFIC: "The key approver's decision resolves the step immediately",
  HYBRID: "Either the percentage threshold OR the key approver's approval — whichever comes first",
};

export default function FlowBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [steps, setSteps] = useState<FlowStepForm[]>([{ ...BLANK_STEP }]);

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await userApi.getAll()).data.data as User[],
  });

  const { data: existingFlow, isLoading: flowLoading } = useQuery({
    queryKey: ["flow", id],
    queryFn: async () => (await flowApi.getById(id!)).data.data,
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingFlow) {
      setName(existingFlow.name);
      setDescription(existingFlow.description ?? "");
      setIsDefault(existingFlow.isDefault);
      setSteps(existingFlow.steps.map((s: any) => ({
        stepIndex: s.stepIndex,
        label: s.label,
        ruleType: s.ruleType as RuleType,
        percentageThreshold: s.percentageThreshold ?? undefined,
        keyApproverId: s.keyApproverId ?? undefined,
        approverIds: s.stepApprovers.map((sa: any) => sa.userId),
      })));
    }
  }, [existingFlow]);

  const createMutation = useMutation({
    mutationFn: () => flowApi.create({ name, description, isDefault, steps }),
    onSuccess: () => {
      toast.success("Approval flow created");
      qc.invalidateQueries({ queryKey: ["flows"] });
      navigate("/admin/flows");
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "Create failed"),
  });

  const updateMutation = useMutation({
    mutationFn: () => flowApi.update(id!, { name, description, isDefault, steps }),
    onSuccess: () => {
      toast.success("Flow updated");
      qc.invalidateQueries({ queryKey: ["flows"] });
      navigate("/admin/flows");
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "Update failed"),
  });

  const addStep = () => {
    setSteps(s => [...s, { ...BLANK_STEP, stepIndex: s.length }]);
  };

  const removeStep = (idx: number) => {
    setSteps(s => s.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepIndex: i })));
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    const newSteps = [...steps];
    const target = idx + dir;
    if (target < 0 || target >= newSteps.length) return;
    [newSteps[idx], newSteps[target]] = [newSteps[target], newSteps[idx]];
    setSteps(newSteps.map((s, i) => ({ ...s, stepIndex: i })));
  };

  const updateStep = (idx: number, patch: Partial<FlowStepForm>) => {
    setSteps(s => s.map((step, i) => i === idx ? { ...step, ...patch } : step));
  };

  const toggleApprover = (stepIdx: number, userId: string) => {
    const step = steps[stepIdx];
    const ids = step.approverIds.includes(userId)
      ? step.approverIds.filter(id => id !== userId)
      : [...step.approverIds, userId];
    updateStep(stepIdx, { approverIds: ids });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Flow name is required"); return; }
    if (steps.length === 0) { toast.error("Add at least one step"); return; }
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (!s.label.trim()) { toast.error(`Step ${i + 1} needs a label`); return; }
      if (s.approverIds.length === 0) { toast.error(`Step ${i + 1} needs at least one approver`); return; }
      if ((s.ruleType === "PERCENTAGE" || s.ruleType === "HYBRID") && !s.percentageThreshold) {
        toast.error(`Step ${i + 1}: Set a percentage threshold for ${s.ruleType} rule`); return;
      }
      if ((s.ruleType === "SPECIFIC" || s.ruleType === "HYBRID") && !s.keyApproverId) {
        toast.error(`Step ${i + 1}: Set a key approver for ${s.ruleType} rule`); return;
      }
    }
    isEdit ? updateMutation.mutate() : createMutation.mutate();
  };

  const eligibleApprovers = users?.filter(u => u.role !== "EMPLOYEE") ?? [];
  const isLoading = usersLoading || (isEdit && flowLoading);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) return <PageLoader />;

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost btn btn-sm w-9 h-9 p-0 flex items-center justify-center">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="page-title">{isEdit ? "Edit Flow" : "Create Approval Flow"}</h1>
            <p className="page-subtitle">Configure sequential steps and rules</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Flow details */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-200">Flow Details</h2>
          <div>
            <label className="label">Flow Name *</label>
            <input className="input" placeholder="e.g. Standard Expense Flow" value={name}
              onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <textarea className="input resize-none" rows={2} placeholder="When is this flow used?"
              value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)}
              className="w-4 h-4 accent-primary-500" />
            <span className="text-sm text-gray-300">Set as default flow for new expenses</span>
          </label>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div key={idx} className="card border border-surface-border">
              {/* Step header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary-600/20 text-primary-400 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <span className="text-sm font-medium text-gray-300">Step {idx + 1}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveStep(idx, -1)} disabled={idx === 0}
                    className="p-1 text-gray-600 hover:text-gray-300 disabled:opacity-30 transition-colors">
                    <ChevronUp size={15} />
                  </button>
                  <button type="button" onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1}
                    className="p-1 text-gray-600 hover:text-gray-300 disabled:opacity-30 transition-colors">
                    <ChevronDown size={15} />
                  </button>
                  {steps.length > 1 && (
                    <button type="button" onClick={() => removeStep(idx)}
                      className="p-1 text-gray-600 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {/* Label */}
                <div>
                  <label className="label text-xs">Step Label *</label>
                  <input className="input text-sm" placeholder="e.g. Finance Review"
                    value={step.label} onChange={e => updateStep(idx, { label: e.target.value })} />
                </div>

                {/* Rule Type */}
                <div>
                  <label className="label text-xs">Approval Rule *</label>
                  <select className="input text-sm" value={step.ruleType}
                    onChange={e => updateStep(idx, { ruleType: e.target.value as RuleType, keyApproverId: undefined, percentageThreshold: undefined })}>
                    {(["ALL", "PERCENTAGE", "SPECIFIC", "HYBRID"] as RuleType[]).map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                    <Info size={11} /> {RULE_DESCRIPTIONS[step.ruleType]}
                  </p>
                </div>

                {/* Percentage threshold */}
                {(step.ruleType === "PERCENTAGE" || step.ruleType === "HYBRID") && (
                  <div>
                    <label className="label text-xs">Approval Threshold (%)</label>
                    <input type="number" min={1} max={100} className="input text-sm"
                      placeholder="e.g. 60"
                      value={step.percentageThreshold ?? ""}
                      onChange={e => updateStep(idx, { percentageThreshold: Number(e.target.value) })} />
                  </div>
                )}

                {/* Approvers multi-select */}
                <div>
                  <label className="label text-xs">Assigned Approvers *</label>
                  <div className="border border-surface-border rounded-xl divide-y divide-surface-border/50 max-h-36 overflow-y-auto">
                    {eligibleApprovers.length === 0 ? (
                      <p className="text-xs text-gray-600 p-3">No managers/admins available</p>
                    ) : (
                      eligibleApprovers.map(u => (
                        <label key={u.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-elevated transition-colors">
                          <input type="checkbox"
                            checked={step.approverIds.includes(u.id)}
                            onChange={() => toggleApprover(idx, u.id)}
                            className="w-3.5 h-3.5 accent-primary-500" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-200">{u.name}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                          <span className="text-xs text-gray-600">{u.role}</span>
                        </label>
                      ))
                    )}
                  </div>
                  {step.approverIds.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">{step.approverIds.length} selected</p>
                  )}
                </div>

                {/* Key approver (SPECIFIC / HYBRID) */}
                {(step.ruleType === "SPECIFIC" || step.ruleType === "HYBRID") && (
                  <div>
                    <label className="label text-xs">Key Approver *</label>
                    <select className="input text-sm" value={step.keyApproverId ?? ""}
                      onChange={e => updateStep(idx, { keyApproverId: e.target.value || undefined })}>
                      <option value="">Select key approver...</option>
                      {step.approverIds.map(uid => {
                        const u = users?.find(x => x.id === uid);
                        return u ? <option key={uid} value={uid}>{u.name}</option> : null;
                      })}
                    </select>
                  </div>
                )}
              </div>
            </div>
          ))}

          <button type="button" onClick={addStep}
            className="btn-ghost btn w-full border-dashed border-2 text-gray-500 hover:text-gray-300">
            <Plus size={15} /> Add Step
          </button>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost btn flex-1">Cancel</button>
          <button type="submit" disabled={isSaving} className="btn-primary btn flex-1">
            {isSaving ? <Spinner size={16} /> : isEdit ? "Save Changes" : "Create Flow"}
          </button>
        </div>
      </form>
    </div>
  );
}
