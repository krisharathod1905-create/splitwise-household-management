import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiPlus, FiUserCheck, FiMail, FiPhone, FiLayers, FiX } from "react-icons/fi";
import { adminApi, officeApi } from "@/lib/api";
import { toast } from "sonner";

export default function AdminStaffPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "Password123!",
    phoneNumber: "",
    officeId: "",
  });

  const { data: staffList, isLoading } = useQuery({
    queryKey: ["adminStaff"],
    queryFn: async () => {
      const res = await adminApi.listStaff();
      return res.data.data.staff;
    },
  });

  const { data: offices } = useQuery({
    queryKey: ["adminOfficesList"],
    queryFn: async () => {
      const res = await officeApi.getAll();
      return res.data.data.offices;
    },
  });

  const createStaffMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await adminApi.createStaff(payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Staff account created successfully!");
      setIsModalOpen(false);
      queryClient.invalidateQueries(["adminStaff"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to create staff.");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Government Counter Staff</h1>
          <p className="text-xs text-slate-500">Manage counter operators and assign office credentials</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5"
        >
          <FiPlus /> Create Staff Account
        </button>
      </div>

      {isLoading ? (
        <div className="h-64 bg-slate-100 animate-pulse rounded-3xl"></div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200/80">
              <tr>
                <th className="p-4">Staff Name</th>
                <th className="p-4">Email Address</th>
                <th className="p-4">Assigned Office</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffList?.map((member) => (
                <tr key={member._id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-900">{member.fullName}</td>
                  <td className="p-4 text-slate-600">{member.email}</td>
                  <td className="p-4 font-medium text-slate-800">{member.assignedOffice?.name || "Unassigned"}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                      {member.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Create Staff Account</h3>
              <button onClick={() => setIsModalOpen(false)}><FiX /></button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createStaffMutation.mutate(form);
              }}
              className="space-y-3 text-xs"
            >
              <input
                type="text"
                placeholder="Full Name"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full p-2.5 border rounded-xl"
              />
              <input
                type="email"
                placeholder="Email Address"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full p-2.5 border rounded-xl"
              />
              <input
                type="password"
                placeholder="Initial Password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full p-2.5 border rounded-xl"
              />
              <select
                required
                value={form.officeId}
                onChange={(e) => setForm({ ...form, officeId: e.target.value })}
                className="w-full p-2.5 border rounded-xl bg-white"
              >
                <option value="">Select Office Assignment</option>
                {offices?.map((o) => (
                  <option key={o._id} value={o._id}>{o.name}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={createStaffMutation.isPending}
                className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs"
              >
                Create Staff Member
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
