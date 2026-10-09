import { useQuery } from "@tanstack/react-query";
import { FiShield, FiCheckCircle, FiClock, FiUserCheck } from "react-icons/fi";
import { adminApi } from "@/lib/api";

export default function AdminAuditPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["adminAuditLogs"],
    queryFn: async () => {
      const res = await adminApi.getAuditLogs();
      return res.data.data.logs;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">System Security & Audit Logs</h1>
        <p className="text-xs text-slate-500">Immutably recorded administrative actions and token operation logs</p>
      </div>

      {isLoading ? (
        <div className="h-64 bg-slate-100 animate-pulse rounded-3xl"></div>
      ) : logs?.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center text-slate-500 text-sm">
          No audit logs recorded yet.
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200/80">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Action</th>
                <th className="p-4">User</th>
                <th className="p-4">IP Address</th>
                <th className="p-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {logs?.map((log) => (
                <tr key={log._id} className="hover:bg-slate-50">
                  <td className="p-4 text-slate-500 font-mono">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-slate-900 text-emerald-400">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-slate-800">{log.userId?.fullName || "System"}</td>
                  <td className="p-4 text-slate-500 font-mono">{log.ipAddress || "127.0.0.1"}</td>
                  <td className="p-4 text-slate-600 truncate max-w-xs">{JSON.stringify(log.details || {})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
