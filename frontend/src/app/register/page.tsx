"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User as UserIcon, ArrowRight } from "lucide-react";
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
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500 text-slate-950 font-extrabold text-2xl mb-4 shadow-lg shadow-emerald-500/20">
          A
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Mulai Bersama ArthaOS
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-400">
          Daftarkan akun pemilik bisnis untuk mengelola inventori dan keuangan toko Anda.
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
              label="Nama Lengkap / Pemilik"
              type="text"
              placeholder="Contoh: Budi Santoso"
              value={name}
              onChange={(e) => setName(e.target.value)}
              leftIcon={<UserIcon className="w-4 h-4" />}
              required
              autoFocus
            />

            <Input
              label="Alamat Email Bisnis"
              type="email"
              placeholder="budi@tokoberkah.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Kata Sandi"
              type="password"
              placeholder="Minimal 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              helperText="Gunakan kombinasi huruf dan angka yang aman"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full text-sm font-semibold"
              isLoading={isLoading}
            >
              Buat Akun Bisnis <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Sudah memiliki akun?{" "}
            <Link
              href="/login"
              className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              Masuk di sini
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
