import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiUsers, FiVolume2, FiCheckCircle, FiXCircle, FiClock, FiSearch } from "react-icons/fi";
import { staffApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function StaffQueuePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const officeId =
    user?.assignedCounter?.officeId?._id ||
    user?.assignedCounter?.officeId ||
    user?.assignedOffice?._id ||
    user?.assignedOfficeId?._id ||
    user?.assignedOfficeId ||
    user?.assignedOfficeIds?.[0]?._id ||
    user?.assignedOfficeIds?.[0];

  const { data: queueData, isLoading } = useQuery({
    queryKey: ["staffQueue", officeId],
    queryFn: async () => {
      if (!officeId) return null;
      const res = await staffApi.getQueue(officeId);
      return res.data.data;
    },
    refetchInterval: 5000,
  });

  const completeMutation = useMutation({
    mutationFn: async () =>
      staffApi.completeService(user?.assignedCounter?._id),
    onSuccess: () => {
      toast.success("Completed token");
      queryClient.invalidateQueries({ queryKey: ["staffQueue", officeId] });
    },
  });

  const markMissedMutation = useMutation({
    mutationFn: async (tokenId) => staffApi.markMissed(tokenId),
    onSuccess: () => {
      toast.warn("Marked token missed");
      queryClient.invalidateQueries({ queryKey: ["staffQueue", officeId] });
    },
  });

  const queue = queueData?.tokens || [];
  const filteredQueue = queue.filter(
    (t) =>
      t.tokenNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.serviceId?.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.userId?.fullName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Live Office Queue</h1>
          <p className="text-xs text-slate-500">Real-time view of all active and waiting tokens for this office</p>
        </div>

        <div className="input-icon-group w-full sm:w-64">
          <FiSearch />
          <input
            type="text"
            placeholder="Filter by token # or service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 bg-slate-100 animate-pulse rounded-3xl"></div>
      ) : filteredQueue.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center text-slate-500 text-sm">
          No tokens in queue.
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200/80">
              <tr>
                <th className="p-4">Position</th>
                <th className="p-4">Token #</th>
                <th className="p-4">Service</th>
                <th className="p-4">Citizen</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQueue.map((token, idx) => (
                <tr key={token._id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-400">#{idx + 1}</td>
                  <td className="p-4 font-black text-slate-900 text-sm">{token.tokenNumber}</td>
                  <td className="p-4 font-medium text-slate-700">{token.serviceId?.name}</td>
                  <td className="p-4 text-slate-600">{token.userId?.fullName || "Guest"}</td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        token.status === "called"
                          ? "bg-rose-100 text-rose-800"
                          : token.status === "in_service"
                          ? "bg-emerald-100 text-emerald-800"
                          : token.status === "checked_in"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {token.status}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    {["called", "in_service"].includes(token.status) && (
                      <>
                        <button
                          onClick={() => completeMutation.mutate(token._id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => markMissedMutation.mutate(token._id)}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-semibold"
                        >
                          Missed
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
