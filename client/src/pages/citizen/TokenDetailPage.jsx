import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FiXCircle,
  FiNavigation,
  FiAlertTriangle,
  FiArrowLeft,
} from "react-icons/fi";
import { tokenApi } from "@/lib/api";
import { getSocket, joinQueueRoom } from "@/lib/socket";
import { toast } from "sonner";
import QRCode from "qrcode";

export default function TokenDetailPage() {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [qrDataUrl, setQrDataUrl] = useState("");

  const {
    data: token,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["token", tokenId],
    queryFn: async () => {
      const res = await tokenApi.getById(tokenId);
      return res.data.data.token;
    },
    refetchInterval: 5000,
  });

  // Generate QR Code image data URL on load
  useEffect(() => {
    if (!token?._id) return;

    let cancelled = false;

    const generateQR = async () => {
      try {
        if (!token.qrCodeData) {
          throw new Error("Secure QR payload is unavailable.");
        }
        const qrValue = token.qrCodeData;

        const url = await QRCode.toDataURL(String(qrValue), {
          width: 200,
          margin: 2,
          errorCorrectionLevel: "M",
        });

        if (!cancelled) {
          setQrDataUrl(url);
        }
      } catch (err) {
        console.error("QR Code generation failed:", err);
        if (!cancelled) setQrDataUrl("");
      }
    };

    generateQR();

    return () => {
      cancelled = true;
    };
  }, [token?._id, token?.qrCodeData]);

  // Real-time Socket Listener
  useEffect(() => {
    const socket = getSocket();
    if (socket && token?.officeId?._id) {
      joinQueueRoom(token.officeId._id);

      const handleUpdate = () => {
        queryClient.invalidateQueries({ queryKey: ["token", tokenId] });
      };

      socket.on("queue:updated", handleUpdate);
      socket.on("token:called", handleUpdate);

      return () => {
        socket.off("queue:updated", handleUpdate);
        socket.off("token:called", handleUpdate);
      };
    }
  }, [token, tokenId, queryClient]);

  // Mutations
  const checkInMutation = useMutation({
    mutationFn: async () => {
      const res = await tokenApi.checkIn(tokenId, {
        userLat: 12.9716,
        userLng: 77.5946,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success(
        "Checked in successfully! Office notified of your arrival.",
      );
      queryClient.invalidateQueries({ queryKey: ["token", tokenId] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Check-in failed.");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await tokenApi.cancel(tokenId);
      return res.data;
    },
    onSuccess: () => {
      toast.info("Token cancelled.");
      queryClient.invalidateQueries({ queryKey: ["token", tokenId] });
      navigate("/dashboard");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Cancellation failed.");
    },
  });

  if (isLoading) {
    return (
      <div className="h-96 bg-slate-100 animate-pulse rounded-3xl max-w-2xl mx-auto"></div>
    );
  }

  if (error || !token) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <FiAlertTriangle className="text-amber-500 text-5xl mx-auto" />
        <h2 className="text-xl font-bold">Token Not Found</h2>
        <Link
          to="/dashboard"
          className="inline-block px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const isCalled = token.status === "called";
  const isInService = token.status === "in_service";
  const isCompleted = token.status === "completed";
  const isCancelled = token.status === "cancelled";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
      >
        <FiArrowLeft /> Back to Dashboard
      </Link>

      {/* Main Token Hero Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`bg-white border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden ${
          isCalled
            ? "border-rose-500 ring-4 ring-rose-500/20"
            : isInService
              ? "border-emerald-500 ring-4 ring-emerald-500/20"
              : "border-slate-200/80"
        }`}
      >
        {/* Call Banner */}
        {isCalled && (
          <div className="bg-rose-600 text-white font-extrabold text-center py-3 px-4 rounded-2xl animate-pulse shadow-lg">
            🔔 YOUR TURN NOW! Please proceed immediately to{" "}
            {token.assignedCounter?.name || "Counter 1"}
          </div>
        )}

        {/* Status Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              {token.officeId?.name}
            </span>
            <h1 className="text-lg font-bold text-slate-900">
              {token.serviceId?.name}
            </h1>
          </div>

          <span
            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider ${
              isCalled
                ? "bg-rose-100 text-rose-800 border border-rose-300"
                : isInService
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : isCompleted
                    ? "bg-slate-100 text-slate-700"
                    : isCancelled
                      ? "bg-rose-50 text-rose-600"
                      : "bg-emerald-500 text-white"
            }`}
          >
            {token.status}
          </span>
        </div>

        {/* Token Number Highlight & QR Code Side-by-Side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center bg-slate-950 text-white p-6 rounded-2xl">
          <div className="space-y-2 text-center sm:text-left">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Your Token Code
            </span>
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-emerald-400">
              {token.tokenNumber}
            </div>
            <div className="text-xs text-slate-300 pt-1">
              Position in Queue:{" "}
              <span className="font-bold text-white">
                {token.queuePosition || 0}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center space-y-2 border-t sm:border-t-0 sm:border-l border-slate-800 pt-4 sm:pt-0">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Token QR Code"
                className="w-28 h-28 bg-white p-2 rounded-xl shadow-md"
              />
            ) : (
              <div className="w-28 h-28 bg-slate-800 rounded-xl flex items-center justify-center text-xs text-slate-500">
                Secure QR unavailable. Please retry.
              </div>
            )}
            <span className="text-[10px] text-slate-400 font-mono">
              Scan at office check-in
            </span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Est Wait Time
            </span>
            <span className="text-lg font-bold text-emerald-700">
              ~{token.prediction?.predictedWaitMinutes || 10} min
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Est Call Time
            </span>
            <span className="text-base font-bold text-slate-800">
              {token.prediction?.estimatedCallTime
                ? new Date(
                    token.prediction.estimatedCallTime,
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Calculating..."}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center col-span-2 sm:col-span-1">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Check-In Status
            </span>
            <span
              className={`text-sm font-bold block ${
                token.checkInStatus?.isCheckedIn
                  ? "text-emerald-600"
                  : "text-amber-600"
              }`}
            >
              {token.checkInStatus?.isCheckedIn
                ? "✓ Checked In"
                : "Not Checked In"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        {!isCompleted && !isCancelled && (
          <div className="space-y-3 pt-2">
            {!token.checkInStatus?.isCheckedIn && (
              <button
                onClick={() => checkInMutation.mutate()}
                disabled={checkInMutation.isPending}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-2xl text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <FiNavigation />{" "}
                {checkInMutation.isPending
                  ? "Checking In..."
                  : "I Have Arrived at Office (Check-In)"}
              </button>
            )}

            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="w-full py-2.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-2xl text-xs font-semibold transition-all border border-slate-200 flex items-center justify-center gap-1.5"
            >
              <FiXCircle /> Cancel This Token
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
