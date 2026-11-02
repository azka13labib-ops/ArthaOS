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
import { AlertCircle, UserCheck } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const { login } = useAuth();

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
    if (!email || !password) {
      setError("Harap isi email dan kata sandi");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const res = await api.auth.login(email, password);
      if (res.token) {
        if (inviteToken) {
          try {
            await api.settings.acceptInvitation(inviteToken);
          } catch (invErr) {
            console.error("Gagal otomatis klaim undangan saat login:", invErr);
          }
        }
        await login(res.token);
        router.push("/pos");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Email atau kata sandi tidak valid");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-foreground font-bold text-sm">
            A
          </div>
          <span className="font-semibold text-base text-foreground">ArthaOS</span>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Masuk ke ArthaOS</CardTitle>
            <CardDescription>
              {inviteInfo ? (
                <span className="text-foreground flex items-center gap-1.5 font-medium mt-1">
                  <UserCheck className="w-4 h-4 text-primary" />
                  Masuk untuk menerima undangan sebagai{" "}
                  <strong className="capitalize text-primary">{inviteInfo.role}</strong>
                </span>
              ) : (
                "Masukkan kredensial akun Anda untuk melanjutkan."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="py-2.5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@toko.com"
                  autoComplete="email"
                  required
                  autoFocus={!inviteInfo}
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
                  autoComplete="current-password"
                  required
                  autoFocus={!!inviteInfo}
                />
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button
              form="login-form"
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Memproses..." : inviteInfo ? "Masuk & Gabung Toko" : "Masuk"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Belum punya akun?{" "}
              <Link
                href={inviteToken ? `/register?invite=${inviteToken}` : "/register"}
                className="text-primary font-medium hover:underline underline-offset-4"
              >
                Daftar sekarang
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginContent />
    </Suspense>
  );
}
