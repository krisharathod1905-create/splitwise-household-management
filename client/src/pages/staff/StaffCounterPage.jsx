import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiCheckCircle, FiCoffee, FiXCircle, FiAlertCircle, FiChevronDown } from "react-icons/fi";
import { staffApi } from "@/lib/api";
import { toast } from "sonner";
import StaffQrScanner from "@/components/staff/StaffQrScanner";

export default function StaffCounterPage() {
  const queryClient = useQueryClient();
  const [selectedCounterId, setSelectedCounterId] = useState("");

  const { data: counters = [], isLoading: countersLoading } = useQuery({
    queryKey: ["staffCounters"],
    queryFn: async () => (await staffApi.getCounters()).data.data.counters,
  });

  useEffect(() => {
    if (!selectedCounterId && counters[0]?._id) {
      setSelectedCounterId(counters[0]._id);
    } else if (selectedCounterId && !counters.some((counter) => counter._id === selectedCounterId)) {
      setSelectedCounterId(counters[0]?._id || "");
    }
  }, [counters, selectedCounterId]);

  const selectedCounter =
    counters.find((counter) => counter._id === selectedCounterId) || counters[0];
  const officeId = selectedCounter?.officeId?._id || selectedCounter?.officeId;
  const counterId = selectedCounter?._id;

  const { data: queueData } = useQuery({
    queryKey: ["staffQueue", officeId],
    queryFn: async () => (await staffApi.getQueue(officeId)).data.data,
    enabled: !!officeId,
    refetchInterval: 5000,
  });

  const [counterStatus, setCounterStatus] = useState(
    selectedCounter?.status || "available",
  );

  useEffect(() => {
    if (selectedCounter) setCounterStatus(selectedCounter.status);
  }, [selectedCounter]);

  const tokenActionMutation = useMutation({
    mutationFn: async ({ action, tokenId }) => {
      if (action === "call") return staffApi.callNext(counterId);
      if (action === "start") return staffApi.startService(counterId);
      if (action === "complete") return staffApi.completeService(counterId);
      return staffApi.markMissed(tokenId);
    },
    onSuccess: () => {
      toast.success("Token status updated.");
      queryClient.invalidateQueries({ queryKey: ["staffQueue", officeId] });
    },
    onError: (error) => toast.error(error.response?.data?.message || "Unable to update token status."),
  });

  const updateCounterStatusMutation = useMutation({
    mutationFn: async (status) => {
      if (!counterId) return;
      return staffApi.updateCounterStatus(counterId, { status });
    },
    onSuccess: (_, status) => {
      setCounterStatus(status);
      toast.success(`Counter status updated to ${status.toUpperCase()}`);
    },
  });

  if (countersLoading) {
    return <div className="mx-auto max-w-3xl space-y-6"><div className="h-32 animate-pulse rounded-3xl bg-slate-100" /><div className="h-64 animate-pulse rounded-3xl bg-slate-100" /></div>;
  }

  if (!counters.length) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
        <FiAlertCircle className="mx-auto mb-3 text-3xl text-amber-600" />
        <h1 className="text-xl font-extrabold text-slate-900">No counter assigned</h1>
        <p className="mt-2 text-sm text-slate-600">Your staff account does not have a counter assigned yet. Ask an administrator to assign one before managing tokens.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Counter Management Console</h1>
        <p className="text-xs text-slate-500">Configure your physical counter, status state, and queue stream</p>
      </div>

      <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-4">
        <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-900">
          <FiChevronDown /> Your assigned counter
        </label>
        <select
          value={selectedCounterId}
          onChange={(event) => setSelectedCounterId(event.target.value)}
          className="w-full rounded-xl border border-emerald-200 bg-white p-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {counters.map((counter) => (
            <option key={counter._id} value={counter._id}>
              {counter.displayName || counter.counterNumber} · {counter.officeId?.name || "Assigned office"}
            </option>
          ))}
        </select>
        <p className="mt-2 text-[11px] text-emerald-800">Only counters assigned to your staff account are listed here.</p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
              {selectedCounter.counterNumber}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {selectedCounter.displayName || selectedCounter.counterNumber}
              </h2>
              <p className="text-xs text-slate-500">{selectedCounter.officeId?.name || "Assigned office"}</p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
              counterStatus === "available"
                ? "bg-emerald-100 text-emerald-800"
                : counterStatus === "paused"
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
              onClick={() =>               updateCounterStatusMutation.mutate("available")}
              className={`p-4 rounded-2xl border text-center font-bold text-xs transition-all space-y-1 ${
                counterStatus === "available"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <FiCheckCircle className="text-lg mx-auto" />
              <span>ACTIVE / OPEN</span>
            </button>

            <button
              onClick={() => updateCounterStatusMutation.mutate("paused")}
              className={`p-4 rounded-2xl border text-center font-bold text-xs transition-all space-y-1 ${
                counterStatus === "paused"
                  ? "bg-amber-500 text-white border-amber-500 shadow-md"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <FiCoffee className="text-lg mx-auto" />
              <span>ON TEA / LUNCH BREAK</span>
            </button>

            <button
              onClick={() => updateCounterStatusMutation.mutate("offline")}
              className={`p-4 rounded-2xl border text-center font-bold text-xs transition-all space-y-1 ${
                counterStatus === "offline"
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

      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Secure QR Check-In</h2>
          <p className="text-xs text-slate-500">
            Scan a citizen QR code to verify it on the server and add the token to this office queue.
          </p>
        </div>
        <StaffQrScanner
          counterId={counterId}
          onCheckedIn={() => {
            queryClient.invalidateQueries({ queryKey: ["staffQueue", officeId] });
          }}
        />
      </div>

      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Token Status Controller</h2>
          <p className="text-xs text-slate-500">Review tokens checked in at this office and move them through the service workflow.</p>
        </div>
        <button
          type="button"
          onClick={() => tokenActionMutation.mutate({ action: "call" })}
          disabled={!counterId || tokenActionMutation.isPending}
          className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Call Next Eligible Token
        </button>
        <div className="space-y-2">
          {(queueData?.tokens || []).map((token) => (
            <div key={token._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div>
                <span className="font-black text-slate-900">{token.tokenNumber}</span>
                <span className="ml-2 text-xs text-slate-500">{token.serviceId?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase text-slate-700">{token.status.replace("_", " ")}</span>
                {token.status === "called" ? (
                  <button type="button" onClick={() => tokenActionMutation.mutate({ action: "start" })} className="rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white">Start</button>
                ) : null}
                {token.status === "in_service" ? (
                  <button type="button" onClick={() => tokenActionMutation.mutate({ action: "complete" })} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white">Complete</button>
                ) : null}
                {["called", "in_service"].includes(token.status) ? (
                  <button type="button" onClick={() => tokenActionMutation.mutate({ action: "missed", tokenId: token._id })} className="rounded-lg bg-slate-700 px-2.5 py-1 text-[10px] font-bold text-white">Missed</button>
                ) : null}
              </div>
            </div>
          ))}
          {!queueData?.tokens?.length && <p className="text-xs text-slate-400">No active tokens for this office today.</p>}
        </div>
      </div>
    </div>
  );
}
