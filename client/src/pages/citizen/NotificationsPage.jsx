import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FiBell, FiCheck } from "react-icons/fi";
import { notificationApi } from "@/lib/api";
import { toast } from "sonner";

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await notificationApi.list();
      return res.data.data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      await notificationApi.markRead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["notifications"]);
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await notificationApi.markAllRead();
    },
    onSuccess: () => {
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries(["notifications"]);
    },
  });

  const list = notificationsData?.notifications || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Notifications</h1>
          <p className="text-xs text-slate-500">Live queue alerts, counter calls, and delays</p>
        </div>

        {list.some((n) => n.status === "unread") && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all"
          >
            <FiCheck /> Mark All Read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="h-64 bg-slate-100 animate-pulse rounded-3xl"></div>
      ) : list.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center space-y-2">
          <FiBell className="text-slate-300 text-4xl mx-auto" />
          <p className="text-slate-600 font-semibold">No notifications yet</p>
          <p className="text-slate-400 text-xs">Queue alerts and turn notifications will show up here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((n) => (
            <div
              key={n._id}
              onClick={() => n.status === "unread" && markReadMutation.mutate(n._id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                n.status === "unread"
                  ? "bg-emerald-50/40 border-emerald-500/40 shadow-sm"
                  : "bg-white border-slate-200/70 opacity-80"
              }`}
            >
              <div
                className={`p-2.5 rounded-xl text-lg shrink-0 ${
                  n.type === "document_update"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                <FiBell />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
                  <span className="text-[10px] text-slate-400">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{n.message}</p>
                {n.relatedTokenId && (
                  <Link to={`/tokens/${n.relatedTokenId}`} onClick={(event) => event.stopPropagation()} className="inline-block pt-1 text-[11px] font-bold text-emerald-700 hover:underline">
                    View token and documents
                  </Link>
                )}
              </div>

              {n.status === "unread" && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-2"></span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
