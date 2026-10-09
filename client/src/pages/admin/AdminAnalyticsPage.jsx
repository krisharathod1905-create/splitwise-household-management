import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { adminApi } from "@/lib/api";

export default function AdminAnalyticsPage() {
  const { data: hourlyData } = useQuery({
    queryKey: ["adminHourlyAnalytics"],
    queryFn: async () => {
      const res = await adminApi.getHourlyStats();
      return res.data.data.hourly || [];
    },
  });

  const chartData = hourlyData?.map((item) => ({
    hour: `${item._id}:00`,
    Issued: item.issued,
    Completed: item.completed,
    Missed: item.missed || 1,
  })) || [
    { hour: "09:00", Issued: 15, Completed: 12, Missed: 1 },
    { hour: "10:00", Issued: 35, Completed: 28, Missed: 2 },
    { hour: "11:00", Issued: 50, Completed: 42, Missed: 3 },
    { hour: "12:00", Issued: 40, Completed: 38, Missed: 1 },
    { hour: "13:00", Issued: 20, Completed: 20, Missed: 0 },
    { hour: "14:00", Issued: 45, Completed: 40, Missed: 2 },
    { hour: "15:00", Issued: 55, Completed: 48, Missed: 3 },
    { hour: "16:00", Issued: 25, Completed: 24, Missed: 1 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Analytics & Forecasting Reports</h1>
        <p className="text-xs text-slate-500">Historical performance trends, congestion bottlenecks, and service SLAs</p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900">Service Resolution Rate by Hour</h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "0.75rem", color: "#fff" }} />
              <Legend />
              <Bar dataKey="Issued" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Completed" fill="#0284c7" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Missed" fill="#f43f5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
