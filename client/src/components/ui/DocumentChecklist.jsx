import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiCheckCircle, FiClock, FiFileText, FiUploadCloud } from "react-icons/fi";
import { documentApi } from "@/lib/api";
import { toast } from "sonner";

const getRequirements = (service) => {
  if (service?.documentRequirements?.length) return service.documentRequirements;
  return (service?.requiredDocuments || []).map((name, index) => ({
    requirementId: `legacy-${index}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}`,
    name,
    required: true,
  }));
};

const statusLabels = {
  missing: "Not uploaded",
  pending: "Awaiting review",
  approved: "Approved",
  rejected: "Replacement requested",
};

export default function DocumentChecklist({ officeId, service, submissionId }) {
  const queryClient = useQueryClient();
  const [uploadingId, setUploadingId] = useState("");
  const queryKey = submissionId
    ? ["documentSubmission", submissionId]
    : ["documentDraft", officeId, service?._id];
  const serviceRequirements = getRequirements(service);

  const { data, isLoading, error } = useQuery({
    queryKey,
    enabled: Boolean(submissionId) || (serviceRequirements.length > 0 && Boolean(officeId && service?._id)),
    refetchInterval: submissionId ? 15000 : false,
    queryFn: async () => {
      const response = submissionId
        ? await documentApi.getSubmission(submissionId)
        : await documentApi.getDraft({ officeId, serviceId: service._id });
      return response.data.data.submission;
    },
  });

  const submission = data || null;
  const requirements = submission?.documents?.length ? submission.documents : serviceRequirements;
  if (!requirements.length) return null;
  const documentsById = new Map((submission?.documents || []).map((document) => [document.requirementId, document]));
  const missingRequired = requirements.filter(
    (requirement) => requirement.required !== false && !documentsById.get(requirement.requirementId)?.hasFile
  ).length;
  const canUpload = (document) => !error && (
    !submission ||
    ["draft", "submitted", "needs_changes"].includes(submission.status) ||
    (["under_review", "ready"].includes(submission.status) && document?.status === "missing" && !document.hasFile)
  );

  const uploadFile = async (requirement, file) => {
    if (!file) return;
    setUploadingId(requirement.requirementId);
    try {
      let current = submission;
      if (!current) {
        const created = await documentApi.createDraft({ officeId, serviceId: service._id });
        current = created.data.data.submission;
      }
      const response = await documentApi.upload(current._id, requirement.requirementId, file);
      queryClient.setQueryData(queryKey, response.data.data.submission);
      await queryClient.invalidateQueries({ queryKey });
      toast.success(`${requirement.name} uploaded securely.`);
    } catch (error) {
      toast.error(error.response?.data?.message || `Could not upload ${requirement.name}.`);
    } finally {
      setUploadingId("");
    }
  };

  const downloadFile = async (requirement) => {
    if (!submission?._id) return;
    try {
      const response = await documentApi.getFile(submission._id, requirement.requirementId);
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = documentsById.get(requirement.requirementId)?.originalName || "document";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not retrieve the private document.");
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5" aria-labelledby="document-checklist-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id="document-checklist-title" className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <FiFileText className="text-emerald-600" /> Document readiness
          </h3>
          <p className="mt-1 text-xs text-slate-500">Upload clear PDF, JPG, or PNG files (up to 10 MB each). Missing files do not block token booking.</p>
        </div>
        {submission && (
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
            submission.status === "ready" ? "bg-emerald-100 text-emerald-800" :
              submission.status === "needs_changes" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
          }`}>
            {submission.status.replace("_", " ")}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
      ) : error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800" role="alert">
          {error.response?.data?.message || "Could not load document status. Refresh and try again."}
        </p>
      ) : (
        <>
          {missingRequired > 0 && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800" role="status">
              {missingRequired} required {missingRequired === 1 ? "document is" : "documents are"} still missing. You can upload now or return later.
            </p>
          )}
          <ul className="space-y-2">
            {requirements.map((requirement) => {
              const document = documentsById.get(requirement.requirementId);
              const status = document?.status || "missing";
              const canUploadDocument = canUpload(document);
              return (
                <li key={requirement.requirementId} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800">
                      {requirement.name} {requirement.required === false ? <span className="font-normal text-slate-400">(optional)</span> : <span className="text-rose-600">*</span>}
                    </p>
                    {requirement.instructions && <p className="mt-0.5 text-[11px] text-slate-500">{requirement.instructions}</p>}
                    <p className={`mt-1 flex items-center gap-1 text-[10px] ${
                      status === "approved" ? "text-emerald-700" : status === "rejected" ? "text-rose-700" : "text-slate-500"
                    }`}>
                      {status === "approved" ? <FiCheckCircle /> : <FiClock />}
                      {statusLabels[status] || statusLabels.missing}
                      {document?.originalName && ` · ${document.originalName}`}
                    </p>
                    {document?.reviewReason && <p className="mt-1 text-[11px] text-rose-700">{document.reviewReason}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {document?.hasFile && (
                      <button type="button" onClick={() => downloadFile(requirement)} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">
                        View file
                      </button>
                    )}
                    {canUploadDocument && (
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-emerald-500">
                        <FiUploadCloud />
                        {uploadingId === requirement.requirementId ? "Uploading..." : document?.hasFile ? "Replace" : "Upload"}
                        <input
                          className="sr-only"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                          disabled={uploadingId === requirement.requirementId}
                          onChange={(event) => {
                            uploadFile(requirement, event.target.files?.[0]);
                            event.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
