"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white border border-slate-200">
          <div className="p-8 border-b border-slate-200 bg-slate-950 text-white">
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              Mulai Bersama ArthaOS
            </h1>
            <p className="text-sm text-slate-400">
              Daftarkan akun pemilik bisnis untuk mengelola inventori dan keuangan toko Anda.
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
                label="Nama Lengkap / Pemilik"
                type="text"
                placeholder="Contoh: Budi Santoso"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />

              <Input
                label="Alamat Email Bisnis"
                type="email"
                placeholder="nama@bisnisanda.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Kata Sandi"
                type="password"
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText="Gunakan kombinasi huruf dan angka yang aman"
                required
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full rounded-none bg-slate-950 text-white hover:bg-slate-800 h-12 text-sm font-bold"
                isLoading={isLoading}
              >
                Buat Akun Bisnis <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
              Sudah memiliki akun?{" "}
              <Link
                href="/login"
                className="font-bold text-slate-950 hover:underline"
              >
                Masuk di sini
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
