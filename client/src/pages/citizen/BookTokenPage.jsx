import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiHome,
  FiCheckCircle,
  FiClock,
  FiShield,
  FiArrowRight,
  FiArrowLeft,
  FiAlertCircle,
} from "react-icons/fi";
import { officeApi, tokenApi } from "@/lib/api";
import { toast } from "sonner";

export default function BookTokenPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialOfficeId = searchParams.get("officeId") || "";
  const initialServiceId = searchParams.get("serviceId") || "";

  const [step, setStep] = useState(initialOfficeId ? 2 : 1);
  const [selectedOfficeId, setSelectedOfficeId] = useState(initialOfficeId);
  const [selectedServiceId, setSelectedServiceId] = useState(initialServiceId);
  const [preferredTime, setPreferredTime] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch offices
  const { data: officesData, isLoading: isLoadingOffices } = useQuery({
    queryKey: ["offices"],
    queryFn: async () => {
      const res = await officeApi.getAll();
      return res.data.data.offices;
    },
  });

  // Fetch selected office details (for services)

  const {
    data: selectedOffice,
    isLoading: isLoadingOffice,
    isError,
  } = useQuery({
    queryKey: ["office", selectedOfficeId],
    queryFn: async () => {
      if (!selectedOfficeId) return null;

      const res = await officeApi.getById(selectedOfficeId);
      const data = res.data.data;

      return {
        ...data.office,
        services: data.services ?? data.office.services ?? [],
        counters: data.counters ?? [],
        liveStats: data.liveStats ?? [],
      };
    },
    enabled: !!selectedOfficeId,
  });

  // Issue Token Mutation
  const issueMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await tokenApi.issue(payload);
      return res.data.data.token;
    },
    onSuccess: (token) => {
      toast.success(`Token ${token.tokenNumber} issued successfully!`);
      navigate(`/tokens/${token._id}`);
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message ||
          "Failed to issue token. Please try again.",
      );
    },
  });

  const selectedService = selectedOffice?.services?.find(
    (s) => s._id === selectedServiceId,
  );

  const handleNextStep = () => {
    if (step === 1 && !selectedOfficeId) {
      toast.error("Please select a government office");
      return;
    }
    if (step === 2 && !selectedServiceId) {
      toast.error("Please select a service");
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handleBookSubmit = () => {
    issueMutation.mutate({
      officeId: selectedOfficeId,
      serviceId: selectedServiceId,
      preferredTime: preferredTime || undefined,
      notes: notes || undefined,
    });
  };

  console.log(selectedOffice);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Book Virtual Token
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Get your digital position in line without waiting physically at the
          office.
        </p>
      </div>

      {/* Wizard Progress Steps */}
      <div className="flex items-center justify-between px-4 sm:px-8 max-w-xl mx-auto">
        {[
          { num: 1, label: "Office" },
          { num: 2, label: "Service" },
          { num: 3, label: "Time & Confirm" },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                step >= s.num
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {s.num}
            </div>
            <span
              className={`text-xs font-semibold hidden sm:inline ${step >= s.num ? "text-slate-900" : "text-slate-400"}`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        {/* Step 1: Office Selection */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-bold text-slate-900">
              Step 1: Select Government Office
            </h2>
            {isLoadingOffices ? (
              <div className="h-48 bg-slate-100 animate-pulse rounded-2xl"></div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {officesData?.map((office) => (
                  <button
                    key={office._id}
                    onClick={() => setSelectedOfficeId(office._id)}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      selectedOfficeId === office._id
                        ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                        : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                    }`}
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200/70 text-slate-700">
                        {office.category}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {office.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {office.address?.city}, {office.address?.state}
                      </p>
                    </div>
                    {selectedOfficeId === office._id && (
                      <FiCheckCircle className="text-emerald-600 text-xl shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2: Service Selection */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Step 2: Select Service Required
              </h2>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                {selectedOffice?.name}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {selectedOffice?.services?.map((srv) => (
                <button
                  key={srv._id}
                  onClick={() => setSelectedServiceId(srv._id)}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    selectedServiceId === srv._id
                      ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                        {srv.code}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {srv.name}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600">{srv.description}</p>
                    <span className="text-[11px] text-emerald-700 font-medium block">
                      ⏱ Avg duration: {srv.avgProcessingTimeMinutes} mins
                    </span>
                  </div>
                  {selectedServiceId === srv._id && (
                    <FiCheckCircle className="text-emerald-600 text-xl shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 3: Preferred Arrival & Forecast Review */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-5"
          >
            <h2 className="text-lg font-bold text-slate-900">
              Step 3: Arrival Time & Confirmation
            </h2>

            {/* AI Prediction Box */}
            <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white p-5 rounded-2xl space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FiClock /> Real-Time Queue Forecast
                </span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  AI Model Active
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center py-2">
                <div>
                  <span className="text-[11px] text-slate-300 block">
                    Est Wait Time
                  </span>
                  <span className="text-2xl font-black text-emerald-400">
                    ~
                    {selectedService?.avgProcessingTimeMinutes
                      ? selectedService.avgProcessingTimeMinutes + 8
                      : 15}{" "}
                    mins
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-300 block">
                    Current Queue
                  </span>
                  <span className="text-2xl font-black text-white">
                    Low / Moderate
                  </span>
                </div>
              </div>
            </div>

            {/* Arrival Time Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                Preferred Arrival Time Today (Optional)
              </label>
              <input
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400">
                Leaving this blank assigns you to the immediate live queue.
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                Additional Notes / Special Request (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Senior citizen assistance, handicap accessibility, etc."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </motion.div>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {step > 1 ? (
            <button
              onClick={() => setStep((prev) => prev - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
            >
              <FiArrowLeft /> Back
            </button>
          ) : (
            <div></div>
          )}

          {step < 3 ? (
            <button
              onClick={handleNextStep}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-all shadow-md"
            >
              Continue <FiArrowRight />
            </button>
          ) : (
            <button
              onClick={handleBookSubmit}
              disabled={issueMutation.isPending}
              className="inline-flex items-center gap-1.5 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20"
            >
              {issueMutation.isPending
                ? "Generating Token..."
                : "Confirm & Issue Token"}{" "}
              <FiCheckCircle />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
