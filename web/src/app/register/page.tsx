"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, UserCheck, CheckCircle2 } from "lucide-react";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{
    email: string;
    role: string;
    store_id: number;
  } | null>(null);

  useEffect(() => {
    if (!inviteToken) return;
    api.settings
      .getInvitation(inviteToken)
      .then((data: any) => {
        if (data && data.email) {
          setInviteInfo(data);
          setEmail(data.email);
        }
      })
      .catch((err) => {
        console.error("Gagal membaca undangan:", err);
      });
  }, [inviteToken]);

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
      const loginRes = await api.auth.login(email, password);
      if (loginRes.token) {
        await login(loginRes.token);
        if (inviteToken) {
          try {
            await api.settings.acceptInvitation(inviteToken);
          } catch (invErr) {
            console.error("Gagal otomatis klaim undangan:", invErr);
          }
        }
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Pendaftaran gagal. Periksa data Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
            A
          </div>
          <span className="font-semibold text-base text-foreground">ArthaOS</span>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Buat akun baru</CardTitle>
            <CardDescription>
              {inviteInfo ? (
                <span className="text-foreground flex items-center gap-1.5 font-medium mt-1">
                  <UserCheck className="w-4 h-4 text-primary" />
                  Undangan bergabung sebagai{" "}
                  <strong className="capitalize text-primary">{inviteInfo.role}</strong>
                </span>
              ) : (
                "Gratis selamanya untuk satu toko. Mulai dalam 2 menit."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="register-form" onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="py-2.5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Budi Santoso"
                  autoComplete="name"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@toko.com"
                  autoComplete="email"
                  readOnly={!!inviteInfo}
                  className={inviteInfo ? "bg-muted cursor-not-allowed opacity-90" : ""}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Kata Sandi</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  autoComplete="new-password"
                  required
                />
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button
              form="register-form"
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Mendaftar & Menggabungkan..." : "Buat Akun & Gabung Toko"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Sudah punya akun?{" "}
              <Link
                href={inviteToken ? `/login?invite=${inviteToken}` : "/login"}
                className="text-primary font-medium hover:underline underline-offset-4"
              >
                Masuk di sini
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <RegisterContent />
    </Suspense>
  );
}
