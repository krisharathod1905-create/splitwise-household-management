import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FiClock, FiCheckCircle, FiXCircle, FiArrowRight, FiFilter } from "react-icons/fi";
import { tokenApi } from "@/lib/api";

export default function TokenHistoryPage() {
  const [filter, setFilter] = useState("all");

  const { data: tokens, isLoading } = useQuery({
    queryKey: ["tokenHistory", filter],
    queryFn: async () => {
      const res = await tokenApi.getMyTokens({ status: filter !== "all" ? filter : undefined });
      return res.data.data.tokens;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Token History</h1>
          <p className="text-xs text-slate-500">View all your previous queue tokens and service records</p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {["all", "completed", "cancelled", "missed"].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                filter === st
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 bg-slate-100 animate-pulse rounded-3xl"></div>
      ) : tokens?.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center space-y-2">
          <p className="text-slate-600 font-semibold">No token records found</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="p-4">Token #</th>
                  <th className="p-4">Office & Service</th>
                  <th className="p-4">Date Issued</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {tokens?.map((token) => (
                  <tr key={token._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-extrabold text-slate-900">{token.tokenNumber}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{token.officeId?.name}</div>
                      <div className="text-slate-400 text-[11px]">{token.serviceId?.name}</div>
                    </td>
                    <td className="p-4 text-slate-500">
                      {new Date(token.createdAt).toLocaleDateString()} {new Date(token.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                          token.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : token.status === "missed"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {token.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        to={`/tokens/${token._id}`}
                        className="inline-flex items-center gap-1 text-emerald-600 font-semibold hover:underline"
                      >
                        View <FiArrowRight />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
