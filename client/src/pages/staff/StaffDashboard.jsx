import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FiVolume2,
  FiCheckCircle,
  FiXCircle,
  FiPlay,
  FiPauseCircle,
  FiUsers,
  FiClock,
  FiAlertCircle,
  FiRefreshCw,
} from "react-icons/fi";
import { staffApi } from "@/lib/api";
import { getSocket, joinQueueRoom } from "@/lib/socket";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function StaffDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCounterId, setSelectedCounterId] = useState(
    user?.assignedCounter?._id || "",
  );
  useEffect(() => {
    if (!selectedCounterId && user?.assignedCounter?._id) {
      setSelectedCounterId(user.assignedCounter._id);
    }
  }, [selectedCounterId, user?.assignedCounter?._id]);

  const officeId =
    user?.assignedCounter?.officeId?._id ||
    user?.assignedCounter?.officeId ||
    user?.assignedOffice?._id ||
    user?.assignedOfficeId?._id ||
    user?.assignedOfficeId ||
    user?.assignedOfficeIds?.[0]?._id ||
    user?.assignedOfficeIds?.[0];

  // Fetch live queue for this office
  const {
    data: queueData,
    isLoading: isLoadingQueue,
    refetch,
  } = useQuery({
    queryKey: ["staffQueue", officeId],
    queryFn: async () => {
      if (!officeId) return null;
      const res = await staffApi.getQueue(officeId);
      return res.data.data;
    },
    enabled: !!officeId,
    refetchInterval: 5000,
  });

  // Socket setup
  useEffect(() => {
    const socket = getSocket();
    if (socket && officeId) {
      joinQueueRoom(officeId);

      const handleUpdate = () => {
        queryClient.invalidateQueries({ queryKey: ["staffQueue", officeId] });
      };

      socket.on("queue:updated", handleUpdate);
      socket.on("token:called", handleUpdate);

      return () => {
        socket.off("queue:updated", handleUpdate);
        socket.off("token:called", handleUpdate);
      };
    }
  }, [officeId, queryClient]);

  // Staff Mutations
  const callNextMutation = useMutation({
    mutationFn: async () => {
      const res = await staffApi.callNext(selectedCounterId);
      return res.data.data.token;
    },
    onSuccess: (token) => {
      toast.success(`📢 Token ${token.tokenNumber} called to Counter!`);
      queryClient.invalidateQueries({ queryKey: ["staffQueue", officeId] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to call next token.");
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await staffApi.completeService(selectedCounterId);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Service marked as completed!");
      queryClient.invalidateQueries({ queryKey: ["staffQueue", officeId] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to complete token.");
    },
  });

  const startMutation = useMutation({
    mutationFn: () => staffApi.startService(selectedCounterId),
    onSuccess: () => {
      toast.success("Service started.");
      queryClient.invalidateQueries({ queryKey: ["staffQueue", officeId] });
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to start service."),
  });

  const markMissedMutation = useMutation({
    mutationFn: async (tokenId) => {
      const res = await staffApi.markMissed(tokenId);
      return res.data;
    },
    onSuccess: () => {
      toast.warn("Token marked as missed (no-show)");
      queryClient.invalidateQueries({ queryKey: ["staffQueue", officeId] });
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message || "Failed to mark token missed.",
      );
    },
  });

  const liveQueue = queueData?.tokens || [];
  const activeToken = liveQueue.find((t) =>
    ["called", "in_service"].includes(t.status),
  );
  const waitingTokens = liveQueue.filter((t) =>
    ["issued", "checked_in"].includes(t.status),
  );

  return (
    <div className="space-y-8">
      {/* Top Staff Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Staff Console •{" "}
              {user?.assignedOffice?.name || "Government Office"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white!">
            Counter Operational Portal
          </h1>
          <p className="text-xs text-slate-400">
            Call citizens, manage service times, and prevent office congestion.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-all border border-slate-700 shrink-0"
        >
          <FiRefreshCw /> Refresh Queue Data
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Active Token & Call Next Control */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero Action Card: Currently Serving / Call Next */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FiVolume2 className="text-emerald-600" /> Active Service Banner
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                Waiting in line:{" "}
                <strong className="text-slate-900">
                  {waitingTokens.length}
                </strong>
              </span>
            </div>

            {activeToken ? (
              <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-6">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold uppercase border border-emerald-500/30">
                    Status: {activeToken.status.replace("_", " ").toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Token ID: #{activeToken._id.slice(-6)}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold block uppercase">
                      Active Citizen Token
                    </span>
                    <span className="text-5xl font-black tracking-tight text-emerald-400">
                      {activeToken.tokenNumber}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 block">
                      Service Requested
                    </span>
                    <span className="text-sm font-bold text-white block">
                      {activeToken.serviceId?.name}
                    </span>
                    <span className="text-xs text-slate-300 block">
                      Citizen: {activeToken.userId?.fullName || "Guest"}
                    </span>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                  <button
                    onClick={() => startMutation.mutate()}
                    disabled={activeToken.status !== "called" || startMutation.isPending}
                    className="py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-2xl text-xs transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <FiPlay className="text-base" /> Start Service
                  </button>
                  <button
                    onClick={() => completeMutation.mutate(activeToken._id)}
                    disabled={completeMutation.isPending}
                    className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-2xl text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                  >
                    <FiCheckCircle className="text-base" /> Complete Service
                  </button>

                  <button
                    onClick={() => markMissedMutation.mutate(activeToken._id)}
                    disabled={markMissedMutation.isPending}
                    className="py-3 px-4 bg-rose-600/80 hover:bg-rose-600 disabled:opacity-50 text-white font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <FiXCircle className="text-base" /> Mark Missed / No Show
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-10 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                  🔔
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    No Active Token at Counter
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Click "Call Next Token" below to alert the next citizen in
                    line.
                  </p>
                </div>

                <button
                  onClick={() => callNextMutation.mutate()}
                  disabled={
                    callNextMutation.isPending || waitingTokens.length === 0
                  }
                  className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold text-sm rounded-2xl transition-all shadow-xl shadow-emerald-500/25 inline-flex items-center gap-2"
                >
                  <FiVolume2 className="text-lg" />
                  {callNextMutation.isPending
                    ? "Calling Next..."
                    : "CALL NEXT TOKEN"}
                </button>
              </div>
            )}
          </div>

          {/* Waiting Tokens Queue Table */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Waiting Queue ({waitingTokens.length})
            </h3>

            {waitingTokens.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No citizens currently waiting in line.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {waitingTokens.map((t, idx) => (
                  <div
                    key={t._id}
                    className="py-3 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-extrabold flex items-center justify-center text-[11px]">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-extrabold text-slate-900 text-sm">
                          {t.tokenNumber}
                        </span>
                        <span className="text-slate-500 block text-[11px]">
                          {t.serviceId?.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          t.status === "checked_in"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t.status === "checked_in" ? "📍 Arrived" : "Issued"}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(t.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Office Counter Stats & Summary */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Queue Metrics Overview
            </h3>
            <div className="space-y-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  Total Tokens Today
                </span>
                <span className="text-lg font-black text-slate-900">
                  {queueData?.stats?.totalTokensToday || 0}
                </span>
              </div>
              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-100 flex items-center justify-between">
                <span className="text-xs text-emerald-800 font-medium">
                  Completed
                </span>
                <span className="text-lg font-black text-emerald-700">
                  {queueData?.stats?.completedToday || 0}
                </span>
              </div>
              <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-100 flex items-center justify-between">
                <span className="text-xs text-amber-800 font-medium">
                  Avg Processing
                </span>
                <span className="text-lg font-black text-amber-800">
                  ~{queueData?.stats?.avgProcessingMinutes || 8} min
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
