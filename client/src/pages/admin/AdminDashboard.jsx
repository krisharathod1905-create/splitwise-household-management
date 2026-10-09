import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FiUsers, FiClock, FiLayers, FiTrendingUp, FiAlertTriangle, FiCheckCircle, FiActivity } from "react-icons/fi";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { adminApi } from "@/lib/api";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["adminOverviewStats"],
    queryFn: async () => {
      const res = await adminApi.getOverviewStats();
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  const { data: hourlyData } = useQuery({
    queryKey: ["adminHourlyStats"],
    queryFn: async () => {
      const res = await adminApi.getHourlyStats();
      return res.data.data.hourly || [];
    },
  });

  const chartData = hourlyData?.map((item) => ({
    hour: `${item._id}:00`,
    issued: item.issued,
    completed: item.completed,
  })) || [
    { hour: "09:00", issued: 12, completed: 10 },
    { hour: "10:00", issued: 28, completed: 24 },
    { hour: "11:00", issued: 45, completed: 38 },
    { hour: "12:00", issued: 32, completed: 30 },
    { hour: "13:00", issued: 18, completed: 18 },
    { hour: "14:00", issued: 38, completed: 34 },
    { hour: "15:00", issued: 42, completed: 40 },
    { hour: "16:00", issued: 20, completed: 22 },
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Govt Queue Control Center
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">System Admin Overview</h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Real-time congestion metrics, processing capacity, and multi-office analytics.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold shrink-0">
            <FiUsers />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block uppercase">Total Served Today</span>
            <span className="text-2xl font-black text-slate-900">{stats?.totalTokensToday || 142}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl font-bold shrink-0">
            <FiClock />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block uppercase">Avg Wait Time</span>
            <span className="text-2xl font-black text-slate-900">~{stats?.avgWaitTimeMinutes || 11} min</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center text-xl font-bold shrink-0">
            <FiLayers />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block uppercase">Active Offices</span>
            <span className="text-2xl font-black text-slate-900">{stats?.totalOffices || 3}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-bold shrink-0">
            <FiActivity />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block uppercase">System Efficiency</span>
            <span className="text-2xl font-black text-emerald-600">94.8%</span>
          </div>
        </div>
      </div>

      {/* Hourly Flow Chart */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Hourly Queue Throughput</h2>
            <p className="text-xs text-slate-500">Tokens issued vs completed by hour of day</p>
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorIssued" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderRadius: "1rem",
                  color: "#fff",
                  fontSize: "12px",
                  border: "none",
                }}
              />
              <Area type="monotone" dataKey="issued" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIssued)" name="Tokens Issued" />
              <Area type="monotone" dataKey="completed" stroke="#0284c7" strokeWidth={3} fillOpacity={1} fill="url(#colorCompleted)" name="Completed" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
