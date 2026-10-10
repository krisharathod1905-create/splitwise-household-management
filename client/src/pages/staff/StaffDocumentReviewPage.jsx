import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiArrowLeft, FiCheck, FiFileText, FiX } from "react-icons/fi";
import { documentApi } from "@/lib/api";
import { toast } from "sonner";

export default function StaffDocumentReviewPage() {
  const { submissionId } = useParams();
  const queryClient = useQueryClient();
  const [reasonTarget, setReasonTarget] = useState("");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState(null);
  const { data: submission, isLoading, error } = useQuery({
    queryKey: ["staffDocumentSubmission", submissionId],
    queryFn: async () => {
      const response = await documentApi.getStaffSubmission(submissionId);
      return response.data.data.submission;
    },
  });
  const canReview = submission && ["submitted", "under_review", "needs_changes"].includes(submission.status);
  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
  }, [preview]);

  const reviewMutation = useMutation({
    mutationFn: ({ requirementId, status, reason: reviewReason }) =>
      documentApi.review(submissionId, requirementId, { status, reason: reviewReason }),
    onSuccess: async (response) => {
      queryClient.setQueryData(["staffDocumentSubmission", submissionId], response.data.data.submission);
      await queryClient.invalidateQueries({ queryKey: ["documentReviewQueue"] });
      setReasonTarget("");
      setReason("");
      toast.success("Document review saved.");
    },
    onError: (requestError) => toast.error(requestError.response?.data?.message || "Could not save the review."),
  });

  const showDocument = async (document) => {
    try {
      const response = await documentApi.getStaffFile(submissionId, document.requirementId);
      const url = URL.createObjectURL(response.data);
      setPreview({ url, name: document.originalName });
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Could not open the private document.");
    }
  };

  if (isLoading) return <div className="h-64 animate-pulse rounded-3xl bg-slate-100" />;
  if (error || !submission) {
    return <div className="space-y-4 rounded-2xl bg-rose-50 p-6 text-sm text-rose-800">
      <p>{error?.response?.data?.message || "Document submission not found."}</p>
      <Link to="/staff/documents" className="font-semibold underline">Back to review queue</Link>
    </div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link to="/staff/documents" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-emerald-700">
        <FiArrowLeft /> Back to document queue
      </Link>
      <header className="rounded-2xl bg-slate-900 p-5 text-white">
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">{submission.officeId?.name}</p>
        <h1 className="mt-1 text-xl font-extrabold">Token {submission.tokenId?.tokenNumber || "Pending"} · {submission.serviceId?.name}</h1>
        <p className="mt-1 text-xs text-slate-300">{submission.userId?.fullName} · {submission.status.replace("_", " ")}</p>
      </header>

      <div className="space-y-3">
        {submission.documents.map((document) => (
          <article key={document.requirementId} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><FiFileText className="text-emerald-600" />{document.name}</h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  {document.required ? "Required" : "Optional"} · {document.originalName || "No file uploaded"} · {document.status}
                </p>
                {document.instructions && <p className="mt-1 text-xs text-slate-600">{document.instructions}</p>}
                {document.reviewReason && <p className="mt-1 text-xs text-rose-700">Previous note: {document.reviewReason}</p>}
              </div>
              <div className="flex gap-2">
                {document.hasFile && (
                  <button type="button" onClick={() => showDocument(document)} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold hover:bg-slate-50">Preview</button>
                )}
                {canReview && document.hasFile && document.status !== "approved" && (
                  <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate({ requirementId: document.requirementId, status: "approved" })}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-50"
                  >
                    <FiCheck /> Approve
                  </button>
                )}
                {canReview && document.hasFile && document.status !== "rejected" && (
                  <button
                    type="button"
                    onClick={() => { setReasonTarget(document.requirementId); setReason(""); }}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700"
                  >
                    <FiX /> Request replacement
                  </button>
                )}
              </div>
            </div>
            {reasonTarget === document.requirementId && (
              <form
                className="space-y-2 rounded-xl bg-rose-50 p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  reviewMutation.mutate({ requirementId: document.requirementId, status: "rejected", reason });
                }}
              >
                <label className="block text-xs font-semibold text-rose-900" htmlFor="replacement-reason">Explain what needs to be corrected</label>
                <textarea id="replacement-reason" required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="w-full rounded-lg border border-rose-200 p-2 text-xs" rows={2} />
                <button type="submit" disabled={reviewMutation.isPending} className="rounded-lg bg-rose-700 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50">Send request</button>
              </form>
            )}
          </article>
        ))}
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-label={`Preview ${preview.name}`}>
          <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white">
            <div className="flex items-center justify-between border-b p-3">
              <span className="truncate text-xs font-semibold">{preview.name}</span>
              <button type="button" onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Close preview"><FiX /></button>
            </div>
            <iframe title={`Private document preview: ${preview.name}`} src={preview.url} className="min-h-0 flex-1" />
          </div>
        </div>
      )}
    </div>
  );
}
