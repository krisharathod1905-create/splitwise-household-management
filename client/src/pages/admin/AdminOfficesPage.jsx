import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FiPlus,
  FiLayers,
  FiCheckCircle,
  FiEdit2,
  FiMapPin,
  FiX,
} from "react-icons/fi";
import { FiFileText, FiTrash2 } from "react-icons/fi";
import { officeApi } from "@/lib/api";
import { toast } from "sonner";

const getErrorMessage = (error, fallback) => {
  const responseData = error?.response?.data;
  const errors = Array.isArray(responseData?.errors)
    ? responseData.errors
        .map((detail) => {
          if (typeof detail === "string") return detail;
          if (!detail || typeof detail !== "object") return "";

          const field = detail.field || detail.path;
          const message = detail.message || detail.error;
          return field && message
            ? `${field}: ${message}`
            : message || field || "";
        })
        .filter(Boolean)
        .join("; ")
    : "";

  return errors || responseData?.message || error?.message || fallback;
};

export default function AdminOfficesPage() {
  const queryClient = useQueryClient();
  const [isAddOfficeModalOpen, setIsAddOfficeModalOpen] = useState(false);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [selectedOfficeId, setSelectedOfficeId] = useState(null);
  const [editingServiceId, setEditingServiceId] = useState(null);

  const [officeForm, setOfficeForm] = useState({
    name: "",
    officeCode: "",
    department: "",
    description: "",
    street: "",
    area: "",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    landmark: "",
  });

  const [serviceForm, setServiceForm] = useState({
    name: "",
    serviceCode: "",
    description: "",
    expectedDurationMinutes: 15,
    documentRequirements: [],
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
      console.log("Office payload:", payload);
      const res = await officeApi.createOffice({
        name: payload.name.trim(),
        officeCode: payload.officeCode.trim().toUpperCase(),
        department: payload.department.trim(),
        description: payload.description,
        address: {
          street: payload.street,
          area: payload.area,
          city: payload.city,
          state: payload.state,
          pincode: payload.pincode,
          landmark: payload.landmark,
        },
      });

      return res.data;
    },

    onSuccess: () => {
      toast.success("Office created successfully!");
      setIsAddOfficeModalOpen(false);

      queryClient.invalidateQueries({
        queryKey: ["adminOffices"],
      });
    },

    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to create office."));
    },
  });

  const createServiceMutation = useMutation({
    mutationFn: async (payload) => {
      const res = editingServiceId
        ? await officeApi.updateService(editingServiceId, payload)
        : await officeApi.createService(selectedOfficeId, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success(
        editingServiceId
          ? "Service settings saved."
          : "Service added to office!",
      );
      setIsAddServiceModalOpen(false);
      setEditingServiceId(null);
      queryClient.invalidateQueries(["adminOffices"]);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to add service."));
    },
  });

  const openServiceEditor = (office, service) => {
    setSelectedOfficeId(office._id);
    setEditingServiceId(service?._id || null);
    setServiceForm(
      service
        ? {
            name: service.name || "",
            serviceCode: service.serviceCode || service.code || "",
            description: service.description || "",
            expectedDurationMinutes:
              service.expectedDurationMinutes ||
              service.avgProcessingTimeMinutes ||
              15,
            documentRequirements: (service.documentRequirements?.length
              ? service.documentRequirements
              : (service.requiredDocuments || []).map((name, index) => ({
                  requirementId: `legacy-${index}-${name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "")
                    .slice(0, 60)}`,
                  name,
                  instructions: "",
                  required: true,
                }))
            ).map((requirement) => ({
              requirementId: requirement.requirementId || crypto.randomUUID(),
              name: requirement.name,
              instructions: requirement.instructions || "",
              required: requirement.required !== false,
            })),
          }
        : {
            name: "",
            serviceCode: "",
            description: "",
            expectedDurationMinutes: 15,
            documentRequirements: [],
          },
    );
    setIsAddServiceModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Government Offices & Services
          </h1>
          <p className="text-xs text-slate-500">
            Configure offices, operational services, and throughput limits
          </p>
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
            <div
              key={office._id}
              className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {office.category}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    {office.name}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <FiMapPin /> {office.address?.street},{" "}
                    {office.address?.city}
                  </p>
                </div>
              </div>

              {/* Services List inside Office */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Configured Services ({office.services?.length || 0})
                  </span>
                  <button
                    onClick={() => openServiceEditor(office)}
                    className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    <FiPlus /> Add Service
                  </button>
                </div>

                <div className="space-y-1.5">
                  {office.services?.map((srv) => (
                    <div
                      key={srv._id}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800">
                          {srv.name}
                        </span>
                        <span className="text-slate-400 text-[10px] block">
                          Code: {srv.serviceCode || srv.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-semibold text-emerald-700">
                          {srv.expectedDurationMinutes ||
                            srv.avgProcessingTimeMinutes}{" "}
                          min
                        </span>
                        <button
                          type="button"
                          onClick={() => openServiceEditor(office, srv)}
                          className="font-bold text-blue-700 hover:underline"
                        >
                          Edit
                        </button>
                      </div>
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
          <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Add Government Office
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOfficeModalOpen(false)}
                className="text-slate-500 hover:text-slate-900"
              >
                <FiX />
              </button>
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
                placeholder="Office Name"
                required
                value={officeForm.name}
                onChange={(e) =>
                  setOfficeForm({ ...officeForm, name: e.target.value })
                }
                className="w-full p-2.5 border rounded-xl"
              />

              <input
                type="text"
                placeholder="Office Code (e.g. KA-03)"
                required
                value={officeForm.officeCode}
                onChange={(e) =>
                  setOfficeForm({
                    ...officeForm,
                    officeCode: e.target.value.toUpperCase(),
                  })
                }
                className="w-full p-2.5 border rounded-xl"
              />

              <input
                type="text"
                placeholder="Department (e.g. Passport Services)"
                required
                value={officeForm.department}
                onChange={(e) =>
                  setOfficeForm({ ...officeForm, department: e.target.value })
                }
                className="w-full p-2.5 border rounded-xl"
              />

              <div className="pt-2">
                <p className="font-bold text-slate-700 mb-2">Office Address</p>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Street Address"
                    value={officeForm.street}
                    onChange={(e) =>
                      setOfficeForm({ ...officeForm, street: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl"
                  />

                  <input
                    type="text"
                    placeholder="Area / Locality"
                    value={officeForm.area}
                    onChange={(e) =>
                      setOfficeForm({ ...officeForm, area: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl"
                  />

                  <input
                    type="text"
                    placeholder="City"
                    required
                    value={officeForm.city}
                    onChange={(e) =>
                      setOfficeForm({ ...officeForm, city: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl"
                  />

                  <input
                    type="text"
                    placeholder="State"
                    value={officeForm.state}
                    onChange={(e) =>
                      setOfficeForm({ ...officeForm, state: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl"
                  />

                  <input
                    type="text"
                    placeholder="Pincode"
                    value={officeForm.pincode}
                    onChange={(e) =>
                      setOfficeForm({ ...officeForm, pincode: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl"
                  />

                  <input
                    type="text"
                    placeholder="Landmark (optional)"
                    value={officeForm.landmark}
                    onChange={(e) =>
                      setOfficeForm({ ...officeForm, landmark: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <textarea
                placeholder="Office Description (optional)"
                rows={3}
                value={officeForm.description}
                onChange={(e) =>
                  setOfficeForm({ ...officeForm, description: e.target.value })
                }
                className="w-full p-2.5 border rounded-xl resize-none"
              />

              <button
                type="submit"
                disabled={createOfficeMutation.isPending}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs"
              >
                {createOfficeMutation.isPending
                  ? "Creating Office..."
                  : "Create Office"}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Add Service Modal */}

      {isAddServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-7 sm:py-5">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                  {editingServiceId ? "Edit Office Service" : "Add New Service"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Configure service details and the documents applicants need.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsAddServiceModalOpen(false);
                  setEditingServiceId(null);
                }}
                aria-label="Close modal"
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Scrollable Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createServiceMutation.mutate(serviceForm);
              }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="space-y-7 overflow-y-auto px-5 py-6 sm:px-7">
                {/* Section 1: Basic Information */}
                <section className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Basic information
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      Enter the service name and its identification details.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">
                        Service name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Driving Licence Renewal"
                        required
                        maxLength={120}
                        value={serviceForm.name}
                        onChange={(e) =>
                          setServiceForm({
                            ...serviceForm,
                            name: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">
                        Service code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. DL-REN"
                        required
                        maxLength={40}
                        value={serviceForm.serviceCode}
                        onChange={(e) =>
                          setServiceForm({
                            ...serviceForm,
                            serviceCode: e.target.value.toUpperCase(),
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm uppercase outline-none transition placeholder:normal-case placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                      />
                      <p className="text-xs text-slate-400">
                        A unique short code for identifying this service.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      Description{" "}
                      <span className="text-slate-400">(optional)</span>
                    </label>
                    <textarea
                      placeholder="Briefly explain what this service is for..."
                      maxLength={1000}
                      rows={3}
                      value={serviceForm.description}
                      onChange={(e) =>
                        setServiceForm({
                          ...serviceForm,
                          description: e.target.value,
                        })
                      }
                      className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </div>

                  <div className="space-y-1.5 sm:max-w-xs">
                    <label className="text-sm font-medium text-slate-700">
                      Expected processing time{" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min={1}
                        max={10080}
                        placeholder="e.g. 30"
                        value={serviceForm.expectedDurationMinutes}
                        onChange={(e) =>
                          setServiceForm({
                            ...serviceForm,
                            expectedDurationMinutes:
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-3 pr-24 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                        Minutes
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Enter the estimated time required to process the service.
                    </p>
                  </div>
                </section>

                <div className="border-t border-slate-100" />

                {/* Section 2: Document Requirements */}
                <section className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Required documents
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Specify the documents applicants must provide.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setServiceForm((form) => ({
                          ...form,
                          documentRequirements: [
                            ...form.documentRequirements,
                            {
                              requirementId: crypto.randomUUID(),
                              name: "",
                              instructions: "",
                              required: true,
                            },
                          ],
                        }))
                      }
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      <span className="text-lg leading-none">+</span>
                      Add document
                    </button>
                  </div>

                  {serviceForm.documentRequirements.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                        <FiFileText size={21} />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        No documents added yet
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Add the documents applicants need for this service.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {serviceForm.documentRequirements.map(
                        (requirement, index) => (
                          <div
                            key={requirement.requirementId}
                            className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:p-5"
                          >
                            <div className="mb-4 flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                                  {index + 1}
                                </span>
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    Document {index + 1}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    Applicant document details
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setServiceForm((form) => ({
                                    ...form,
                                    documentRequirements:
                                      form.documentRequirements.filter(
                                        (_, itemIndex) => itemIndex !== index,
                                      ),
                                  }))
                                }
                                aria-label={`Remove document ${index + 1}`}
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </div>

                            <div className="space-y-3">
                              <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">
                                  Document name{" "}
                                  <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Aadhaar Card"
                                  required
                                  maxLength={120}
                                  value={requirement.name}
                                  onChange={(e) =>
                                    setServiceForm((form) => ({
                                      ...form,
                                      documentRequirements:
                                        form.documentRequirements.map(
                                          (item, itemIndex) =>
                                            itemIndex === index
                                              ? {
                                                  ...item,
                                                  name: e.target.value,
                                                }
                                              : item,
                                        ),
                                    }))
                                  }
                                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">
                                  Instructions{" "}
                                  <span className="text-slate-400">
                                    (optional)
                                  </span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Upload a clear, valid copy"
                                  maxLength={500}
                                  value={requirement.instructions}
                                  onChange={(e) =>
                                    setServiceForm((form) => ({
                                      ...form,
                                      documentRequirements:
                                        form.documentRequirements.map(
                                          (item, itemIndex) =>
                                            itemIndex === index
                                              ? {
                                                  ...item,
                                                  instructions: e.target.value,
                                                }
                                              : item,
                                        ),
                                    }))
                                  }
                                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                                />
                              </div>

                              <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-3">
                                <input
                                  type="checkbox"
                                  checked={requirement.required}
                                  onChange={(e) =>
                                    setServiceForm((form) => ({
                                      ...form,
                                      documentRequirements:
                                        form.documentRequirements.map(
                                          (item, itemIndex) =>
                                            itemIndex === index
                                              ? {
                                                  ...item,
                                                  required: e.target.checked,
                                                }
                                              : item,
                                        ),
                                    }))
                                  }
                                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-emerald-600"
                                />
                                <span>
                                  <span className="block text-sm font-medium text-slate-700">
                                    Mandatory document
                                  </span>
                                  <span className="mt-0.5 block text-xs text-slate-500">
                                    Applicants must provide this document to
                                    proceed.
                                  </span>
                                </span>
                              </label>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}

                  {serviceForm.documentRequirements.length > 0 && (
                    <p className="text-xs text-slate-500">
                      {serviceForm.documentRequirements.length} document
                      {serviceForm.documentRequirements.length === 1
                        ? ""
                        : "s"}{" "}
                      configured
                    </p>
                  )}
                </section>
              </div>

              {/* Sticky Footer */}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddServiceModalOpen(false);
                    setEditingServiceId(null);
                  }}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={createServiceMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createServiceMutation.isPending ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Saving service...
                    </>
                  ) : editingServiceId ? (
                    "Save Changes"
                  ) : (
                    "Create Service"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
