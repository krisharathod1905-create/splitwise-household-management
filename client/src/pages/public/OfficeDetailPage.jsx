import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FiMapPin, FiClock, FiUsers, FiCheckCircle, FiPhone, FiMail, FiArrowRight, FiShield, FiAlertTriangle } from "react-icons/fi";
import { officeApi } from "@/lib/api";

export default function OfficeDetailPage() {
  const { officeId } = useParams();

  const { data: office, isLoading, error } = useQuery({
    queryKey: ["office", officeId],
    queryFn: async () => {
      const res = await officeApi.getById(officeId);
      return res.data.data.office;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-4 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-40 bg-slate-200 rounded-3xl"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-slate-200 rounded-3xl lg:col-span-2"></div>
          <div className="h-96 bg-slate-200 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  if (error || !office) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-4 max-w-xl mx-auto text-center space-y-4">
        <FiAlertTriangle className="text-amber-500 text-5xl mx-auto" />
        <h2 className="text-2xl font-bold text-slate-900">Office Not Found</h2>
        <p className="text-slate-600">The government office you requested could not be loaded.</p>
        <Link to="/offices" className="inline-block px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold">
          Back to Offices Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Office Banner / Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-700/50"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-block">
              {office.category || "Government Office"}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">{office.name}</h1>
            <p className="text-slate-300 text-sm flex items-center gap-2">
              <FiMapPin className="text-emerald-400 shrink-0" />
              {office.address?.street}, {office.address?.city}, {office.address?.state} - {office.address?.pincode}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2">
              {office.contactPhone && (
                <span className="flex items-center gap-1.5">
                  <FiPhone className="text-emerald-400" /> {office.contactPhone}
                </span>
              )}
              {office.contactEmail && (
                <span className="flex items-center gap-1.5">
                  <FiMail className="text-teal-400" /> {office.contactEmail}
                </span>
              )}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center gap-2 min-w-[200px]">
            <span className="text-xs uppercase font-semibold tracking-wider text-emerald-300">Live Status</span>
            <div className="text-3xl font-black text-white">
              {office.stats?.activeQueue || 0} <span className="text-xs font-normal text-slate-300">in line</span>
            </div>
            <p className="text-xs text-slate-300">Est Wait: ~{office.stats?.avgWaitMinutes || 10} mins</p>
            <Link
              to={`/book-token?officeId=${office._id}`}
              className="w-full mt-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs text-center transition-all shadow-lg shadow-emerald-500/20"
            >
              Book Virtual Token
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 columns: Available Services & Queue Status */}
        <div className="lg:col-span-2 space-y-8">
          {/* Services Section */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Available Services</h2>
              <p className="text-slate-500 text-sm mt-1">Select a service to view details and book your spot</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {office.services?.map((srv) => (
                <div
                  key={srv._id}
                  className="p-5 bg-slate-50 border border-slate-200/70 rounded-2xl hover:border-emerald-500/50 hover:bg-emerald-50/30 transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md uppercase">
                        {srv.code}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <FiClock className="text-slate-400" /> ~{srv.avgProcessingTimeMinutes} min service
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {srv.name}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2">{srv.description}</p>
                  </div>

                  {srv.requiredDocuments?.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60">
                      <span className="text-[11px] font-semibold text-slate-500 block mb-1">Required Docs:</span>
                      <ul className="text-xs text-slate-600 space-y-1">
                        {srv.requiredDocuments.slice(0, 3).map((doc, idx) => (
                          <li key={idx} className="flex items-center gap-1.5 text-[11px]">
                            <FiCheckCircle className="text-emerald-500 shrink-0" /> {doc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Link
                    to={`/book-token?officeId=${office._id}&serviceId=${srv._id}`}
                    className="w-full py-2 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1 mt-2"
                  >
                    Get Token <FiArrowRight />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 column: Operating Info & Counter Overview */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FiClock className="text-emerald-600" /> Operating Hours
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Monday - Friday</span>
                <span className="font-semibold text-slate-800">
                  {office.operatingHours?.open || "09:00 AM"} - {office.operatingHours?.close || "05:00 PM"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Saturday</span>
                <span className="font-semibold text-slate-800">09:00 AM - 01:00 PM</span>
              </div>
              <div className="flex justify-between py-1.5 text-rose-600 font-medium">
                <span>Sunday</span>
                <span>Closed</span>
              </div>
            </div>
          </div>

          <div className="bg-emerald-950 text-white rounded-3xl p-6 shadow-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
              <FiShield /> Anti-Overcrowding System
            </div>
            <h4 className="text-lg font-bold">Why Use QueueLess?</h4>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                <span>Track your exact queue position in real-time from anywhere.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0"></span>
                <span>Get smart SMS / Push notifications when your turn is approaching.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0"></span>
                <span>Arrive right on time without standing in physical crowds.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
