"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { AlertCircle } from "lucide-react";

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
            <CardTitle className="text-lg font-semibold">Masuk ke akun Anda</CardTitle>
            <CardDescription>
              Kelola toko, stok, dan keuangan dari satu tempat.
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
                  autoFocus
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
              {isLoading ? "Masuk..." : "Masuk"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Belum punya akun?{" "}
              <Link
                href="/register"
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
