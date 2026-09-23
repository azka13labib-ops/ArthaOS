"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white border border-slate-200">
          <div className="p-8 border-b border-slate-200 bg-slate-950 text-white">
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              Masuk ke ArthaOS
            </h1>
            <p className="text-sm text-slate-400">
              Kelola transaksi kasir, stok gudang, dan laporan laba rugi dalam satu sistem.
            </p>
          </div>
          
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div
                  role="alert"
                  className="p-4 text-sm font-medium text-rose-800 bg-rose-50 border border-rose-200"
                >
                  {error}
                </div>
              )}

              <Input
                label="Alamat Email"
                type="email"
                placeholder="nama@bisnisanda.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />

              <Input
                label="Kata Sandi"
                type="password"
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full rounded-none bg-slate-950 text-white hover:bg-slate-800 h-12 text-sm font-bold"
                isLoading={isLoading}
              >
                Masuk ke Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-200">
              <div className="p-4 border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    Akun Demo Siap Pakai
                  </p>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    budi@artha-retail.com
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFillDemo}
                  className="rounded-none border-slate-300 text-xs px-4 h-9 bg-white w-full sm:w-auto"
                >
                  Gunakan
                </Button>
              </div>
            </div>

            <div className="mt-8 text-center text-sm text-slate-500">
              Belum memiliki akun bisnis?{" "}
              <Link
                href="/register"
                className="font-bold text-slate-950 hover:underline"
              >
                Daftar sekarang
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
