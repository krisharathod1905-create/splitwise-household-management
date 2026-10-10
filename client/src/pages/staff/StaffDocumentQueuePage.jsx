import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiFileText, FiSearch } from "react-icons/fi";
import { documentApi, officeApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function StaffDocumentQueuePage() {
  const { user } = useAuth();
  const assignedOfficeIds = useMemo(
    () => (user?.assignedOfficeIds || []).map((office) => String(office?._id || office)),
    [user]
  );
  const [officeId, setOfficeId] = useState(assignedOfficeIds[0] || "");
  const [search, setSearch] = useState("");
  const { data: offices = [] } = useQuery({
    queryKey: ["documentReviewOffices"],
    queryFn: async () => {
      const response = await officeApi.getAll();
      const allOffices = response.data.data.offices || [];
      return user?.role === "admin"
        ? allOffices
        : allOffices.filter((office) => assignedOfficeIds.includes(String(office._id)));
    },
  });
  const effectiveOfficeId = offices.some((office) => String(office._id) === officeId)
    ? officeId
    : String(offices[0]?._id || "");
  const { data: submissions = [], isLoading, error } = useQuery({
    queryKey: ["documentReviewQueue", effectiveOfficeId],
    enabled: Boolean(effectiveOfficeId),
    refetchInterval: 15000,
    queryFn: async () => {
      const response = await documentApi.listStaffSubmissions({ officeId: effectiveOfficeId, limit: 100 });
      return response.data.data.submissions || [];
    },
  });
  const filtered = submissions.filter((submission) => {
    const searchText = `${submission.tokenId?.tokenNumber || ""} ${submission.userId?.fullName || ""} ${submission.serviceId?.name || ""}`.toLowerCase();
    return searchText.includes(search.toLowerCase());
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Document verification</h1>
          <p className="mt-1 text-xs text-slate-500">Review citizen submissions for your assigned office and services.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {offices.length > 1 && (
            <select value={effectiveOfficeId} onChange={(event) => setOfficeId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
              {offices.map((office) => <option key={office._id} value={office._id}>{office.name}</option>)}
            </select>
          )}
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
            <FiSearch className="text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Token, citizen, or service" className="w-52 py-2 text-xs outline-none" />
          </label>
        </div>
      </header>

      {error && <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error.response?.data?.message || "Could not load the review queue."}</p>}
      {isLoading ? (
        <div className="h-48 animate-pulse rounded-3xl bg-slate-100" />
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
          <FiFileText className="mx-auto text-3xl text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-700">No document submissions need review.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((submission) => {
            const missing = submission.documents.filter((document) => document.required && !document.hasFile).length;
            return (
              <Link key={submission._id} to={`/staff/documents/${submission._id}`} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-slate-900">
                    {submission.tokenId?.tokenNumber || "Token pending"} · {submission.userId?.fullName || "Citizen"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{submission.serviceId?.name} · {submission.officeId?.name}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{submission.documents.filter((document) => document.hasFile).length} file(s) · {missing} required file(s) missing</p>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                  submission.status === "needs_changes" ? "bg-amber-100 text-amber-800" :
                    submission.status === "under_review" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"
                }`}>{submission.status.replace("_", " ")}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
