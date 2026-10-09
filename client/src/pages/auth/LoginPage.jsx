import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiMail, FiLock, FiArrowRight, FiShield, FiUserCheck } from "react-icons/fi";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const doLogin = async (emailVal, passwordVal) => {
    setIsLoading(true);
    try {
      const res = await authApi.login({ email: emailVal, password: passwordVal });
      const { user, accessToken } = res.data.data;
      login(user, accessToken);
      toast.success(`Welcome back, ${user.fullName}!`);
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "staff") navigate("/staff");
      else navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed. Please check credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    await doLogin(email, password);
  };

  const handleDemoLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    await doLogin(demoEmail, demoPassword);
  };

  return (
    <div className="min-h-screen pt-28 pb-20 flex items-center justify-center px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-xl font-black mx-auto shadow-lg shadow-emerald-500/20">
            Q
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Sign in to QueueLess</h1>
          <p className="text-xs text-slate-500">Access your government tokens, notifications, or counter portal</p>
        </div>

        {/* Quick Demo Login Pill Buttons */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center">
            ⚡ Quick Demo 1-Click Login
          </span>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              onClick={() => handleDemoLogin("aarav@demo.queueless.app", "Demo@1234")}
              className="py-1.5 px-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold rounded-xl transition-all text-center text-[11px]"
            >
              Citizen
            </button>
            <button
              onClick={() => handleDemoLogin("staff1.rtomumanh@demo.queueless.app", "Staff@1234")}
              className="py-1.5 px-2 bg-teal-100 hover:bg-teal-200 text-teal-800 font-semibold rounded-xl transition-all text-center text-[11px]"
            >
              Staff
            </button>
            <button
              onClick={() => handleDemoLogin("admin@queueless.app", "Admin@1234")}
              className="py-1.5 px-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl transition-all text-center text-[11px]"
            >
              Admin
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Email Address</label>
            <div className="input-icon-group">
              <FiMail />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Password</label>
            <div className="input-icon-group">
              <FiLock />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            {isLoading ? "Signing in..." : "Sign In"} <FiArrowRight />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-emerald-600 hover:underline">
            Register as Citizen
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
