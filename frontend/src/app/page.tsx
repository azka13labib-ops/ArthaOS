"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";

export default function GatewayPage() {
  const { token, user } = useAuth();
  const { activeStore } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background">
      <div className="w-full max-w-sm px-6 flex flex-col items-center text-center">
        {/* Simple Clean Logo */}
        <div className="mb-8 flex items-center justify-center w-12 h-12 rounded-lg bg-primary text-foreground font-serif italic text-2xl">
          A
        </div>

        <div className="space-y-2 mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            ArthaOS
          </h1>
          <p className="text-muted-foreground text-sm">
            Enterprise Retail Engine
          </p>
        </div>

        <div className="w-full">
          {token ? (
            <div className="bg-card border border-border rounded-none p-6 text-left shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Lock className="w-4 h-4 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sesi Aktif</p>
                  <p className="text-sm font-medium text-foreground">{user?.email}</p>
                </div>
              </div>

              <Link href="/dashboard" className="block w-full">
                <button className="w-full bg-primary hover:bg-primary/90 text-foreground py-2.5 rounded-md font-medium text-sm transition-colors">
                  Masuk ke Ruang Kerja
                </button>
              </Link>
              
              {activeStore && (
                <div className="mt-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Toko terhubung: <span className="font-medium text-foreground">{activeStore.name}</span>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3 w-full">
              <Link href="/login" className="w-full">
                <button className="w-full bg-primary hover:bg-primary/90 text-foreground py-2.5 rounded-md font-medium text-sm transition-colors">
                  Otorisasi Sistem
                </button>
              </Link>
              <Link href="/register" className="w-full">
                <button className="w-full border border-input bg-background hover:bg-accent hover:text-accent-foreground py-2.5 rounded-md font-medium text-sm transition-colors">
                  Registrasi Akses
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Honest Minimal Footer */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-xs text-muted-foreground">
          ArthaOS Core
        </p>
      </div>
    </div>
  );
}
