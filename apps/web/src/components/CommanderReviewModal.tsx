import React, { useState } from 'react';
import { DispatchOrder, LogisticsHub, api } from '../services/api';
import { ShieldAlert, AlertTriangle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface CommanderReviewModalProps {
  order: DispatchOrder;
  originHub?: LogisticsHub | null;
  destinationHub?: LogisticsHub | null;
  onClose: () => void;
  onActionComplete: () => void;
}

export const CommanderReviewModal: React.FC<CommanderReviewModalProps> = ({
  order,
  originHub,
  destinationHub,
  onClose,
  onActionComplete,
}) => {
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showRejectInput, setShowRejectInput] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Commander user ID for demo sign-off
  const COMMANDER_USER_ID = '00000000-0000-0000-0000-000000000001';

  const handleApprove = async () => {
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (order.status === 'PROPOSED') {
        await api.submitDispatch(order.id);
      }
      await api.approveDispatch(order.id, COMMANDER_USER_ID);
      setSuccessMsg('Dispatch approved successfully. Human sign-off confirmed.');
      setTimeout(() => {
        onActionComplete();
        onClose();
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Approval failed');
      setSubmitting(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setError('Please specify a rejection reason');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (order.status === 'PROPOSED') {
        await api.submitDispatch(order.id);
      }
      await api.rejectDispatch(order.id, COMMANDER_USER_ID, rejectionReason);
      setSuccessMsg('Dispatch rejected successfully.');
      setTimeout(() => {
        onActionComplete();
        onClose();
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Rejection failed');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-command-panel border border-command-border rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-fade-in text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-command-border">
          <div className="flex items-center space-x-2">
            <ShieldAlert size={20} className="text-command-accent" />
            <div>
              <h2 className="text-sm font-bold text-command-text uppercase tracking-wider">
                Commander Operational Review
              </h2>
              <p className="text-[10px] text-command-muted">
                Order Code: <span className="font-mono text-command-text">{order.order_code}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-command-muted hover:text-white font-bold text-base px-2 py-0.5 rounded bg-command-card"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 bg-command-danger/10 border border-command-danger/30 text-command-danger rounded flex items-center space-x-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold rounded flex items-center space-x-2">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Hubs Origin & Destination */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-command-card/60 rounded border border-command-border">
          <div>
            <div className="text-[10px] font-bold text-command-muted uppercase mb-1">Origin Logistics Depot:</div>
            <div className="font-bold text-command-text text-xs">{originHub?.name || order.origin_hub_id}</div>
            <div className="text-[11px] text-command-muted">{originHub?.state} ({originHub?.district})</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-command-muted uppercase mb-1">Destination Relief Hub:</div>
            <div className="font-bold text-command-text text-xs">{destinationHub?.name || order.destination_hub_id}</div>
            <div className="text-[11px] text-command-muted">{destinationHub?.state} ({destinationHub?.district})</div>
          </div>
        </div>

        {/* Allocated Items */}
        <div className="p-3 bg-command-card/60 rounded border border-command-border space-y-1.5">
          <div className="text-[10px] font-bold text-command-muted uppercase mb-1">Requested Resources for Dispatch:</div>
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            {Object.entries(order.allocated_items).map(([category, qty]) => (
              <div key={category} className="bg-command-bg p-2 rounded border border-command-border/50 flex justify-between">
                <span className="text-command-muted">{category}:</span>
                <span className="font-bold text-command-text">{qty} units</span>
              </div>
            ))}
          </div>
        </div>

        {/* Route & Safety Status */}
        <div className="p-3 bg-command-card/60 rounded border border-command-border flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-command-muted uppercase">Recommended Corridor Route:</div>
            <div className="font-bold text-command-accent">{order.recommended_route_id || 'NH-27 Main Highway'}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-command-muted uppercase">Dispatch Lifecycle Status:</div>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded border inline-block ${
                order.status === 'PENDING_APPROVAL'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : order.status === 'PROPOSED'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              }`}
            >
              ● {order.status}
            </span>
          </div>
        </div>

        {/* Action Form / Buttons */}
        {showRejectInput ? (
          <form onSubmit={handleReject} className="space-y-3 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-command-text mb-1">
                Rejection Reason (Required):
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="State operational or safety reasons for rejecting this dispatch proposal..."
                className="w-full bg-command-bg border border-command-border rounded p-2 text-xs text-command-text focus:outline-none"
                rows={2}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowRejectInput(false)}
                className="px-3 py-1.5 rounded bg-command-card hover:bg-command-border text-command-muted hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 rounded bg-command-danger text-white font-bold flex items-center space-x-1"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between pt-3 border-t border-command-border">
            <button
              onClick={() => setShowRejectInput(true)}
              disabled={submitting}
              className="px-4 py-2 rounded bg-command-danger/20 text-command-danger hover:bg-command-danger hover:text-white border border-command-danger/40 font-bold transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            >
              <XCircle size={16} />
              <span>REJECT PROPOSAL</span>
            </button>

            <button
              onClick={handleApprove}
              disabled={submitting}
              className="px-6 py-2 rounded bg-command-success hover:bg-command-success/80 text-white font-bold transition-colors flex items-center space-x-1.5 shadow-lg disabled:opacity-50"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              <span>{submitting ? 'APPROVING...' : 'APPROVE DISPATCH (HUMAN SIGN-OFF)'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
