"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  UserCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sun,
  Moon,
  Receipt,
  Boxes,
  TrendingUp,
  ShieldCheck,
  Store,
  HelpCircle,
  Loader2,
} from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{
    email: string;
    role: string;
    store_id: number;
  } | null>(null);

  // Load saved email if remembered
  useEffect(() => {
    const savedEmail = localStorage.getItem("arthaos_saved_email");
    if (savedEmail && !inviteToken) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, [inviteToken]);

  // Load invitation if invite token present
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
        if (rememberMe) {
          localStorage.setItem("arthaos_saved_email", email);
        } else {
          localStorage.removeItem("arthaos_saved_email");
        }

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
    <div className="min-h-screen bg-background text-foreground grid grid-cols-1 lg:grid-cols-12 selection:bg-primary/20 selection:text-primary">
      {/* LEFT COLUMN: Authentic Brand Showcase & Value Proposition (Desktop only) */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between p-10 xl:p-14 border-r border-border bg-muted/20 relative overflow-hidden">
        {/* Top Header: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-base shadow-xs">
            A
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-foreground block">
              ArthaOS
            </span>
            <span className="text-[11px] font-medium text-muted-foreground tracking-wider uppercase block">
              Sistem Kasir & Operasional Ritel
            </span>
          </div>
        </div>

        {/* Center: Business Value Showcase */}
        <div className="max-w-xl my-auto py-10 space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
              <Store className="w-3.5 h-3.5" />
              Platform Operasional UMKM Indonesia
            </div>
            <h2 className="text-3xl xl:text-4xl font-bold tracking-tight text-foreground leading-[1.2]">
              Kendali penuh transaksi, stok resep, hingga arus kas harian.
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Solusi terpadu kasir POS modern, kalkulasi otomatis modal bahan baku, dan pembukuan transparan tanpa selisih.
            </p>
          </div>

          {/* Authentic Feature Highlights */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-border bg-card shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Kasir POS Cepat & Buku Kasbon
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Dukung pembayaran tunai, transfer, QRIS, serta pencatatan kasbon pelanggan terstruktur dengan riwayat cicilan.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-border bg-card shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Boxes className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Kalkulasi Resep & HPP Otomatis
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Stok bahan baku otomatis berkurang tiap porsi menu terjual dengan snapshot harga modal akurat seketika.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-border bg-card shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Laba Rugi & Arus Kas Akurat
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Pisahkan keuntungan operasional dari mutasi kas riil, belanja persediaan stok, dan pelunasan utang supplier tempo.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Status / Trust Bar */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/80 pt-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>Sistem Aktif & Terisolasi Multi-Tenant</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>Enkripsi AES-256</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Focused Login Form */}
      <div className="col-span-12 lg:col-span-6 xl:col-span-5 flex flex-col justify-between p-6 sm:p-10 xl:p-12 min-h-screen">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between w-full">
          {/* Mobile Brand Identity */}
          <div className="flex lg:hidden items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-xs">
              A
            </div>
            <div>
              <span className="font-bold text-sm text-foreground block">ArthaOS</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                POS & Manajemen Ritel
              </span>
            </div>
          </div>

          <div className="hidden lg:block">
            {/* Desktop spacer */}
          </div>

          {/* Theme Toggle Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-9 px-3 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
            title={theme === "dark" ? "Ganti ke tema terang" : "Ganti ke tema gelap"}
            aria-label="Ganti mode tema tampilan"
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-4 w-4 text-amber-500" />
                <span className="hidden sm:inline">Terang</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-purple-600" />
                <span className="hidden sm:inline">Gelap</span>
              </>
            )}
          </Button>
        </div>

        {/* Center: Form Container */}
        <div className="w-full max-w-sm mx-auto my-auto py-8">
          <div className="mb-6 space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Masuk ke Akun
            </h1>
            <p className="text-sm text-muted-foreground">
              Gunakan email dan kata sandi toko Anda untuk mengakses kasir dan data operasional.
            </p>
          </div>

          {/* Invitation Banner */}
          {inviteInfo && (
            <div className="mb-5 p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3">
              <UserCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-foreground">
                <p className="font-semibold text-primary">Undangan Tim Toko Terdeteksi</p>
                <p className="text-muted-foreground mt-0.5">
                  Anda diundang bergabung sebagai{" "}
                  <strong className="capitalize text-foreground font-semibold">
                    {inviteInfo.role}
                  </strong>
                  . Masuk untuk langsung mengaktifkan akses Anda.
                </p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-5 py-3 rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Email Akun Toko
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@toko.com"
                  autoComplete="email"
                  className="h-11 pl-10 pr-3.5 text-sm rounded-lg"
                  required
                  autoFocus={!inviteInfo}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Kata Sandi
                </Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  autoComplete="current-password"
                  className="h-11 pl-10 pr-11 text-sm rounded-lg"
                  required
                  autoFocus={!!inviteInfo}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Convenience Row */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                />
                <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Ingat email saya
                </span>
              </label>

              <button
                type="button"
                onClick={() => setForgotPasswordOpen(true)}
                className="text-xs text-primary hover:underline underline-offset-4 font-medium transition-colors cursor-pointer"
              >
                Lupa kata sandi?
              </button>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold rounded-lg shadow-xs mt-2 cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memproses Masuk...
                </>
              ) : (
                <>
                  {inviteInfo ? "Masuk & Terima Undangan" : "Masuk ke Dashboard"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Registration Switcher */}
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Belum memiliki akun toko?{" "}
              <Link
                href={inviteToken ? `/register?invite=${inviteToken}` : "/register"}
                className="text-primary font-semibold hover:underline underline-offset-4 ml-0.5 inline-flex items-center gap-0.5"
              >
                Daftar toko baru
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-[11px] text-muted-foreground pt-4">
          ArthaOS • Sistem Kasir & Manajemen Ritel UMKM Indonesia
        </div>
      </div>

      {/* Forgot Password Guidance Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
              <HelpCircle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-semibold">Bantuan Masuk & Reset Sandi</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Demi keamanan data transaksi dan hak akses multi-pengguna toko, pengaturan ulang kata sandi diatur secara terpusat:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm text-foreground">
            <div className="p-3 rounded-xl border border-border bg-muted/30 flex gap-3">
              <div className="font-bold text-primary">1.</div>
              <div>
                <p className="font-medium text-foreground">Staf / Kasir</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Hubungi Pemilik Toko (Owner) atau Manajer untuk memperbarui kata sandi akun kasir Anda melalui menu Pengaturan Anggota.
                </p>
              </div>
            </div>
            <div className="p-3 rounded-xl border border-border bg-muted/30 flex gap-3">
              <div className="font-bold text-primary">2.</div>
              <div>
                <p className="font-medium text-foreground">Pemilik Toko (Owner)</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Jika Anda adalah pemilik utama dan lupa kata sandi, silakan gunakan email pendaftaran atau hubungi administrator sistem ArthaOS.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-lg"
              onClick={() => setForgotPasswordOpen(false)}
            >
              Mengerti, Kembali ke Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
