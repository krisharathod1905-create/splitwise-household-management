import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiPlus, FiLayers, FiCheckCircle, FiEdit2, FiMapPin, FiX } from "react-icons/fi";
import { officeApi } from "@/lib/api";
import { toast } from "sonner";

export default function AdminOfficesPage() {
  const queryClient = useQueryClient();
  const [isAddOfficeModalOpen, setIsAddOfficeModalOpen] = useState(false);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [selectedOfficeId, setSelectedOfficeId] = useState(null);

  const [officeForm, setOfficeForm] = useState({
    name: "",
    code: "",
    category: "passport",
    description: "",
    street: "",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
  });

  const [serviceForm, setServiceForm] = useState({
    name: "",
    code: "",
    description: "",
    avgProcessingTimeMinutes: 15,
  });

  const { data: offices, isLoading } = useQuery({
    queryKey: ["adminOffices"],
    queryFn: async () => {
      const res = await officeApi.getAll();
      return res.data.data.offices;
    },
  });

  const createOfficeMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await officeApi.createOffice({
        name: payload.name,
        code: payload.code,
        category: payload.category,
        description: payload.description,
        address: {
          street: payload.street,
          city: payload.city,
          state: payload.state,
          pincode: payload.pincode,
        },
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Office created successfully!");
      setIsAddOfficeModalOpen(false);
      queryClient.invalidateQueries(["adminOffices"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to create office.");
    },
  });

  const createServiceMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await officeApi.createService(selectedOfficeId, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Service added to office!");
      setIsAddServiceModalOpen(false);
      queryClient.invalidateQueries(["adminOffices"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to add service.");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Government Offices & Services</h1>
          <p className="text-xs text-slate-500">Configure offices, operational services, and throughput limits</p>
        </div>

        <button
          onClick={() => setIsAddOfficeModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5"
        >
          <FiPlus /> Add New Office
        </button>
      </div>

      {isLoading ? (
        <div className="h-64 bg-slate-100 animate-pulse rounded-3xl"></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {offices?.map((office) => (
            <div key={office._id} className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {office.category}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{office.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <FiMapPin /> {office.address?.street}, {office.address?.city}
                  </p>
                </div>
              </div>

              {/* Services List inside Office */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Configured Services ({office.services?.length || 0})</span>
                  <button
                    onClick={() => {
                      setSelectedOfficeId(office._id);
                      setIsAddServiceModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    <FiPlus /> Add Service
                  </button>
                </div>

                <div className="space-y-1.5">
                  {office.services?.map((srv) => (
                    <div key={srv._id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{srv.name}</span>
                        <span className="text-slate-400 text-[10px] block">Code: {srv.code}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700">
                        {srv.avgProcessingTimeMinutes} min
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Office Modal */}
      {isAddOfficeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Add Government Office</h3>
              <button onClick={() => setIsAddOfficeModalOpen(false)}><FiX /></button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createOfficeMutation.mutate(officeForm);
              }}
              className="space-y-3 text-xs"
            >
              <input
                type="text"
                placeholder="Office Name (e.g. RTO Indiranagar)"
                required
                value={officeForm.name}
                onChange={(e) => setOfficeForm({ ...officeForm, name: e.target.value })}
                className="w-full p-2.5 border rounded-xl"
              />
              <input
                type="text"
                placeholder="Code (e.g. KA-03)"
                required
                value={officeForm.code}
                onChange={(e) => setOfficeForm({ ...officeForm, code: e.target.value })}
                className="w-full p-2.5 border rounded-xl"
              />
              <input
                type="text"
                placeholder="Street Address"
                required
                value={officeForm.street}
                onChange={(e) => setOfficeForm({ ...officeForm, street: e.target.value })}
                className="w-full p-2.5 border rounded-xl"
              />
              <button
                type="submit"
                disabled={createOfficeMutation.isPending}
                className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs"
              >
                Create Office
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      {isAddServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Add Service to Office</h3>
              <button onClick={() => setIsAddServiceModalOpen(false)}><FiX /></button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createServiceMutation.mutate(serviceForm);
              }}
              className="space-y-3 text-xs"
            >
              <input
                type="text"
                placeholder="Service Name (e.g. DL Renewal)"
                required
                value={serviceForm.name}
                onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                className="w-full p-2.5 border rounded-xl"
              />
              <input
                type="text"
                placeholder="Service Code (e.g. DL-REN)"
                required
                value={serviceForm.code}
                onChange={(e) => setServiceForm({ ...serviceForm, code: e.target.value })}
                className="w-full p-2.5 border rounded-xl"
              />
              <input
                type="number"
                placeholder="Avg Duration (Minutes)"
                required
                value={serviceForm.avgProcessingTimeMinutes}
                onChange={(e) => setServiceForm({ ...serviceForm, avgProcessingTimeMinutes: Number(e.target.value) })}
                className="w-full p-2.5 border rounded-xl"
              />
              <button
                type="submit"
                disabled={createServiceMutation.isPending}
                className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs"
              >
                Add Service
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
