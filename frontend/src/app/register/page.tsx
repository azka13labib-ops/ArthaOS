"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Semua bidang wajib diisi");
      return;
    }

    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      await api.auth.register(name, email, password);
      // Auto login after register
      const loginRes = await api.auth.login(email, password);
      if (loginRes.token) {
        await login(loginRes.token);
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Pendaftaran gagal. Silakan periksa data Anda."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md px-4 relative z-10"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-glow mb-6 group">
            <span className="font-serif italic text-2xl text-white group-hover:scale-105 transition-transform">A</span>
          </Link>
          <h2 className="text-3xl font-medium tracking-tight text-white mb-2">
            Registrasi Akses
          </h2>
          <p className="text-muted-foreground">
            Daftarkan entitas bisnis Anda ke ekosistem ArthaOS
          </p>
        </div>

        <div className="p-[1px] rounded-2xl bg-gradient-to-b from-white/10 to-transparent">
          <div className="bg-card backdrop-blur-xl border border-card-border rounded-2xl p-8 shadow-glass">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-3 text-sm font-medium text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-2"
                >
                  <div className="w-1 h-full bg-rose-500 rounded-full" />
                  {error}
                </motion.div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Nama Lengkap / Pemilik
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                    placeholder="Budi Santoso"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Alamat Email Bisnis
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                    placeholder="nama@bisnisanda.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Kata Sandi
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                    placeholder="Minimal 8 karakter"
                    required
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isLoading}
                className="w-full relative group overflow-hidden bg-white text-black py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                <span className="relative z-10">{isLoading ? "Memproses Registrasi..." : "Buat Akun Bisnis"}</span>
                {!isLoading && <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />}
              </motion.button>
            </form>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-slate-400">
          Sudah memiliki akses?{" "}
          <Link
            href="/login"
            className="text-white hover:text-primary transition-colors"
          >
            Masuk di sini
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

