"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Harap isi email dan kata sandi");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const res = await api.auth.login(email, password);
      if (res.token) {
        await login(res.token);
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Email atau kata sandi tidak valid"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail("budi@artha-retail.com");
    setPassword("password123");
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        {/* Brand Icon */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500 text-slate-950 font-extrabold text-2xl mb-4 shadow-lg shadow-emerald-500/20">
          A
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Masuk ke ArthaOS
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-400">
          Kelola transaksi kasir, stok gudang, dan laporan laba rugi dalam satu sistem.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="p-3.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2"
              >
                <span>{error}</span>
              </div>
            )}

            <Input
              label="Alamat Email"
              type="email"
              placeholder="nama@bisnisanda.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
              autoFocus
            />

            <Input
              label="Kata Sandi"
              type="password"
              placeholder="Minimal 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full text-sm font-semibold"
              isLoading={isLoading}
            >
              Masuk ke Dashboard <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          {/* Demo Auto-fill Helper */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-800">
                  Akun Demo Siap Pakai (Data Lengkap)
                </p>
                <p className="text-[11px] text-slate-500">
                  budi@artha-retail.com / password123
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFillDemo}
                className="text-xs font-semibold"
              >
                Gunakan
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Belum memiliki akun bisnis?{" "}
            <Link
              href="/register"
              className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              Daftar sekarang
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
