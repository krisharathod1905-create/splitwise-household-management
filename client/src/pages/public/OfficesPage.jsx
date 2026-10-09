import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FiSearch, FiMapPin, FiClock, FiUsers, FiFilter, FiArrowRight, FiCheckCircle } from "react-icons/fi";
import { officeApi } from "@/lib/api";

export default function OfficesPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: officesData, isLoading, error } = useQuery({
    queryKey: ["offices", search, selectedCategory],
    queryFn: async () => {
      const res = await officeApi.getAll({
        search: search || undefined,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
      });
      return res.data.data;
    },
  });

  const categories = [
    { id: "all", label: "All Offices" },
    { id: "passport", label: "Passport Office" },
    { id: "rto", label: "RTO / Transport" },
    { id: "revenue", label: "Revenue / Tax" },
    { id: "civic", label: "Civic / Municipal" },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Live Government Offices Directory
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight"
        >
          Find Your Nearby <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">Government Office</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-slate-600 text-lg"
        >
          Check live queue length, predicted waiting times, and available services before heading out.
        </motion.p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white/80 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="input-icon-group flex-1">
            <FiSearch />
            <input
              type="text"
              placeholder="Search by office name, location, or pincode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <FiFilter className="text-slate-400 text-sm shrink-0 mr-1" />
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Offices Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-2xl"></div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700">
          Failed to load offices directory. Please try again later.
        </div>
      ) : officesData?.offices?.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
          <p className="text-slate-600 font-semibold text-lg">No offices found matching your criteria</p>
          <p className="text-slate-400 text-sm">Try tweaking your search term or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {officesData?.offices?.map((office, idx) => {
            const isHighCongestion = office.stats?.activeQueue > 15;
            const isMediumCongestion = office.stats?.activeQueue > 5 && office.stats?.activeQueue <= 15;

            return (
              <motion.div
                key={office._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-emerald-500/30 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                      {office.category || "Govt Office"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isHighCongestion
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : isMediumCongestion
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isHighCongestion ? "bg-rose-500" : isMediumCongestion ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                      ></span>
                      {isHighCongestion ? "Busy Queue" : isMediumCongestion ? "Moderate" : "Smooth Flow"}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                      {office.name}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                      <FiMapPin className="text-slate-400 shrink-0" />
                      {office.address?.city}, {office.address?.state} - {office.address?.pincode}
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">{office.description}</p>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
                        <FiUsers className="text-emerald-600" />
                        <span>Active Queue</span>
                      </div>
                      <span className="text-lg font-extrabold text-slate-900">
                        {office.stats?.activeQueue || 0} <span className="text-xs font-normal text-slate-500">people</span>
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
                        <FiClock className="text-teal-600" />
                        <span>Avg Wait</span>
                      </div>
                      <span className="text-lg font-extrabold text-slate-900">
                        {office.stats?.avgWaitMinutes || 12} <span className="text-xs font-normal text-slate-500">min</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <FiCheckCircle className="text-emerald-500" /> {office.servicesCount || 3} Services
                  </span>
                  <Link
                    to={`/offices/${office._id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-emerald-600 transition-all shadow-sm"
                  >
                    View & Book <FiArrowRight />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
