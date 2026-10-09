import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiMonitor, FiCheckCircle, FiVolume2, FiCoffee, FiXCircle } from "react-icons/fi";
import { tokenApi, adminApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function StaffCounterPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const officeId = user?.assignedOffice?._id || user?.assignedOffice;

  const [counterStatus, setCounterStatus] = useState("active");

  const updateCounterStatusMutation = useMutation({
    mutationFn: async (status) => {
      const counterId = user?.assignedCounter?._id;
      if (!counterId) return;
      return tokenApi.updateCounterStatus(counterId, { status });
    },
    onSuccess: (_, status) => {
      setCounterStatus(status);
      toast.success(`Counter status updated to ${status.toUpperCase()}`);
    },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Counter Management Console</h1>
        <p className="text-xs text-slate-500">Configure your physical counter, status state, and queue stream</p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
              C1
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {user?.assignedCounter?.name || "Counter 1 - General Services"}
              </h2>
              <p className="text-xs text-slate-500">{user?.assignedOffice?.name || "Government Office"}</p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
              counterStatus === "active"
                ? "bg-emerald-100 text-emerald-800"
                : counterStatus === "break"
                ? "bg-amber-100 text-amber-800"
                : "bg-rose-100 text-rose-800"
            }`}
          >
            ● {counterStatus}
          </span>
        </div>

        {/* Counter Quick Status Toggles */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-700 block">Set Counter Operating Mode</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => updateCounterStatusMutation.mutate("active")}
              className={`p-4 rounded-2xl border text-center font-bold text-xs transition-all space-y-1 ${
                counterStatus === "active"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <FiCheckCircle className="text-lg mx-auto" />
              <span>ACTIVE / OPEN</span>
            </button>

            <button
              onClick={() => updateCounterStatusMutation.mutate("break")}
              className={`p-4 rounded-2xl border text-center font-bold text-xs transition-all space-y-1 ${
                counterStatus === "break"
                  ? "bg-amber-500 text-white border-amber-500 shadow-md"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <FiCoffee className="text-lg mx-auto" />
              <span>ON TEA / LUNCH BREAK</span>
            </button>

            <button
              onClick={() => updateCounterStatusMutation.mutate("closed")}
              className={`p-4 rounded-2xl border text-center font-bold text-xs transition-all space-y-1 ${
                counterStatus === "closed"
                  ? "bg-rose-600 text-white border-rose-600 shadow-md"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <FiXCircle className="text-lg mx-auto" />
              <span>COUNTER CLOSED</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
