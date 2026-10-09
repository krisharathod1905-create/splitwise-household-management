import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FiPlus, FiClock, FiCheckCircle, FiAlertCircle, FiArrowRight, FiMapPin, FiCalendar, FiSmartphone } from "react-icons/fi";
import { tokenApi } from "@/lib/api";
import { getSocket, joinUserRoom } from "@/lib/socket";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function CitizenDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: myTokensData, isLoading, refetch } = useQuery({
    queryKey: ["myTokens"],
    queryFn: async () => {
      const res = await tokenApi.getMyTokens({ status: "all" });
      return res.data.data.tokens || [];
    },
    refetchInterval: 10000,
  });

  // Socket.IO setup for live status updates on active token
  useEffect(() => {
    const socket = getSocket();
    if (socket && user?._id) {
      joinUserRoom(user._id);

      const handleQueueUpdate = (data) => {
        queryClient.invalidateQueries(["myTokens"]);
        toast.info(`Token Update: ${data.message || "Queue status updated"}`);
      };

      const handleTokenCalled = (data) => {
        queryClient.invalidateQueries(["myTokens"]);
        toast.success(`🔔 YOUR TURN! Token ${data.tokenNumber} called at ${data.counterName || "Counter"}`);
      };

      socket.on("queue:updated", handleQueueUpdate);
      socket.on("token:called", handleTokenCalled);

      return () => {
        socket.off("queue:updated", handleQueueUpdate);
        socket.off("token:called", handleTokenCalled);
      };
    }
  }, [user, queryClient]);

  const activeTokens = myTokensData?.filter((t) => ["issued", "checked_in", "called", "in_service"].includes(t.status)) || [];
  const pastTokens = myTokensData?.filter((t) => ["completed", "cancelled", "missed"].includes(t.status)) || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Welcome Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #064E3B 100%)",
          padding: "1.75rem 2rem",
          borderRadius: "1.5rem",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Citizen Portal</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold" style={{ color: "#FFFFFF" }}>
            Welcome back, {user?.fullName?.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm">
            Track your queue tokens in real-time or get a new virtual token without waiting in lines.
          </p>
        </div>

        <Link
          to="/book-token"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs transition-all shadow-lg shadow-emerald-500/20 shrink-0"
        >
          <FiPlus className="text-base" /> Book New Token
        </Link>
      </div>

      {/* Active Tokens Section */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
            Active Tokens ({activeTokens.length})
          </h2>
          <button
            onClick={() => refetch()}
            className="text-xs text-slate-500 hover:text-emerald-600 font-semibold"
          >
            Refresh Now
          </button>
        </div>

        {isLoading ? (
          <div className="h-44 bg-slate-100 animate-pulse rounded-2xl"></div>
        ) : activeTokens.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h3 className="text-base font-bold text-slate-900">No Active Queue Tokens</h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              You don't have any pending tokens right now. Need a government service today?
            </p>
            <Link
              to="/book-token"
              className="inline-block px-5 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Get a Virtual Token
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeTokens.map((token) => {
              const isCalled = token.status === "called";
              const isInService = token.status === "in_service";

              return (
                <motion.div
                  key={token._id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-md relative overflow-hidden"
                  style={{
                    border: isCalled || isInService ? "2px solid #10B981" : undefined,
                  }}
                >
                  {/* Status Banner Tag */}
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {token.officeId?.name}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                        isCalled
                          ? "bg-rose-500 text-white animate-bounce"
                          : isInService
                          ? "bg-emerald-600 text-white"
                          : token.status === "checked_in"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {isCalled
                        ? "🔔 CALL NEXT - GO TO COUNTER"
                        : isInService
                        ? "⚡ IN SERVICE"
                        : token.status === "checked_in"
                        ? "📍 CHECKED IN"
                        : "⏳ IN QUEUE"}
                    </span>
                  </div>

                  {/* Token Number Display */}
                  <div className="flex items-baseline justify-between bg-slate-900 text-white p-4 rounded-2xl">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block uppercase">Token Number</span>
                      <span className="text-3xl font-black tracking-tight text-emerald-400">{token.tokenNumber}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-slate-400 block uppercase">People Ahead</span>
                      <span className="text-2xl font-bold text-white">{token.queuePosition || 0}</span>
                    </div>
                  </div>

                  {/* Info Row */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Service</span>
                      <span className="font-bold text-slate-800 truncate block">{token.serviceId?.name}</span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Est Wait Time</span>
                      <span className="font-bold text-emerald-700 block">
                        ~{token.prediction?.predictedWaitMinutes || 10} mins
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <FiClock /> Issued: {new Date(token.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <Link
                      to={`/tokens/${token._id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      Track Live Details <FiArrowRight />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent History Summary */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }} className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Recent Service History</h2>
          <Link to="/history" className="text-xs font-semibold text-emerald-600 hover:underline">
            View All History
          </Link>
        </div>

        {pastTokens.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No past tokens found.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {pastTokens.slice(0, 5).map((token) => (
              <div key={token._id} className="py-3 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800">{token.tokenNumber}</span>
                  <span className="text-slate-500 block">{token.officeId?.name} • {token.serviceId?.name}</span>
                </div>
                <div className="text-right">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                      token.status === "completed"
                        ? "bg-emerald-100 text-emerald-800"
                        : token.status === "missed"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {token.status}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {new Date(token.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
