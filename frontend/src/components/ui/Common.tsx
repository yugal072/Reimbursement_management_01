import { Loader2 } from "lucide-react";

export function Spinner({ size = 20 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-primary-400" />;
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Spinner size={32} />
        <p className="text-gray-500 text-sm animate-pulse-subtle">Loading...</p>
      </div>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="card border-red-500/20 bg-red-500/5 text-red-400 text-sm flex items-center gap-2 p-4">
      <span>⚠️</span>
      <span>{message}</span>
    </div>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "default" | "lg" | "xl";
}

export function Modal({ open, onClose, title, children, size = "default" }: ModalProps) {
  if (!open) return null;
  const sizeClass = size === "xl" ? "modal-xl" : size === "lg" ? "modal-lg" : "";
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${sizeClass}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({
  open, onClose, onConfirm, title, message, isLoading, danger
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isLoading?: boolean;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-gray-300 text-sm mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="btn-ghost btn">Cancel</button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={danger ? "btn-danger btn" : "btn-primary btn"}
        >
          {isLoading ? <Spinner size={14} /> : "Confirm"}
        </button>
      </div>
    </Modal>
  );
}
