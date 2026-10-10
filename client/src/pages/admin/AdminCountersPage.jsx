import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiEdit2, FiLayers, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import { adminApi, officeApi } from "@/lib/api";
import { toast } from "sonner";

const emptyForm = { officeId: "", counterNumber: "", displayName: "", staffId: "", supportedServiceIds: [], status: "available" };

export default function AdminCountersPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const { data: offices = [] } = useQuery({
    queryKey: ["adminOfficesList"],
    queryFn: async () => (await officeApi.getAll()).data.data.offices,
  });
  const { data: staff = [] } = useQuery({
    queryKey: ["adminStaff"],
    queryFn: async () => (await adminApi.listStaff({ limit: 100 })).data.data.staff,
  });
  const { data: counters = [], isLoading } = useQuery({
    queryKey: ["adminCounters"],
    queryFn: async () => (await adminApi.getCounters()).data.data.counters,
  });
  const { data: services = [] } = useQuery({
    queryKey: ["counterServices", form.officeId],
    queryFn: async () => (await officeApi.getServices(form.officeId)).data.data.services,
    enabled: !!form.officeId,
  });

  const staffById = useMemo(() => Object.fromEntries(staff.map((member) => [member._id, member])), [staff]);

  const saveMutation = useMutation({
    mutationFn: (payload) => editingId ? adminApi.updateCounter(editingId, payload) : adminApi.createCounter(payload),
    onSuccess: () => {
      toast.success(editingId ? "Counter updated." : "Counter created.");
      setForm(emptyForm);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["adminCounters"] });
    },
    onError: (error) => toast.error(error.response?.data?.message || "Unable to save counter."),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteCounter(id),
    onSuccess: () => {
      toast.success("Counter deleted.");
      queryClient.invalidateQueries({ queryKey: ["adminCounters"] });
    },
    onError: (error) => toast.error(error.response?.data?.message || "Unable to delete counter."),
  });

  const edit = (counter) => setForm({
    officeId: counter.officeId?._id || counter.officeId,
    counterNumber: counter.counterNumber,
    displayName: counter.displayName || "",
    staffId: counter.staffId?._id || "",
    supportedServiceIds: (counter.supportedServiceIds || []).map((service) => service._id || service),
    status: counter.status,
  }) || setEditingId(counter._id);

  const submit = (event) => {
    event.preventDefault();
    if (!form.officeId || !form.counterNumber || !form.supportedServiceIds.length) {
      toast.error("Select an office, counter number, and at least one service.");
      return;
    }
    saveMutation.mutate({ ...form, staffId: form.staffId || undefined });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Office Counters</h1>
          <p className="text-xs text-slate-500">Create service counters and assign each counter to one staff member.</p>
        </div>
        <button type="button" onClick={() => { setForm(emptyForm); setEditingId(null); }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500">
          <FiPlus /> New Counter
        </button>
      </div>

      <form onSubmit={submit} className="grid gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Office</label>
          <select required value={form.officeId} onChange={(e) => setForm({ ...form, officeId: e.target.value, supportedServiceIds: [] })} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm">
            <option value="">Select office</option>
            {offices.map((office) => <option key={office._id} value={office._id}>{office.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Counter number</label>
          <input required value={form.counterNumber} onChange={(e) => setForm({ ...form, counterNumber: e.target.value })} placeholder="C-01" className="w-full rounded-xl border border-slate-200 p-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Display name</label>
          <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Passport Services Counter" className="w-full rounded-xl border border-slate-200 p-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Assigned staff member</label>
          <select value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm">
            <option value="">Unassigned</option>
            {staff.filter((member) => member.role === "staff").map((member) => <option key={member._id} value={member._id}>{member.fullName} ({member.email})</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="mb-2 block text-xs font-semibold text-slate-700">Services handled by this counter</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {services.map((service) => (
              <label key={service._id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs text-slate-700">
                <input type="checkbox" checked={form.supportedServiceIds.includes(service._id)} onChange={(e) => setForm({ ...form, supportedServiceIds: e.target.checked ? [...form.supportedServiceIds, service._id] : form.supportedServiceIds.filter((id) => id !== service._id) })} />
                <span className="font-semibold">{service.name}</span><span className="text-slate-400">{service.serviceCode}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2 md:col-span-2">
          <button disabled={saveMutation.isPending} className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">{editingId ? "Update Counter" : "Create Counter"}</button>
          {editingId && <button type="button" onClick={() => { setForm(emptyForm); setEditingId(null); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700"><FiX /> Cancel</button>}
        </div>
      </form>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        {isLoading ? <div className="h-48 animate-pulse bg-slate-100" /> : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200/80 bg-slate-50 text-slate-500"><tr><th className="p-4">Counter</th><th className="p-4">Office</th><th className="p-4">Staff</th><th className="p-4">Services</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {counters.map((counter) => <tr key={counter._id}>
                <td className="p-4 font-bold text-slate-900">{counter.displayName || counter.counterNumber}<span className="ml-2 text-slate-400">{counter.counterNumber}</span></td>
                <td className="p-4 text-slate-600">{counter.officeId?.name || counter.officeId}</td>
                <td className="p-4 text-slate-600">{counter.staffId?.fullName || staffById[counter.staffId]?.fullName || "Unassigned"}</td>
                <td className="p-4 text-slate-600">{counter.supportedServiceIds?.map((service) => service.name || service).join(", ")}</td>
                <td className="p-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold uppercase text-slate-700">{counter.status}</span></td>
                <td className="p-4 text-right"><button type="button" onClick={() => { setEditingId(counter._id); edit(counter); }} className="mr-2 rounded-lg p-2 text-slate-600 hover:bg-slate-100"><FiEdit2 /></button><button type="button" onClick={() => deleteMutation.mutate(counter._id)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><FiTrash2 /></button></td>
              </tr>)}
              {!counters.length && <tr><td colSpan="6" className="p-10 text-center text-slate-400">No counters configured.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
