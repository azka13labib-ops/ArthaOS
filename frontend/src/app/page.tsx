"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Lock } from "lucide-react";
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
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] opacity-70" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center text-center max-w-lg px-6"
      >
        {/* Luxury Logo */}
        <div className="mb-10 relative">
          <motion.div 
            initial={{ rotate: -10, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-glow flex items-center justify-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 blur-sm" />
            <span className="font-serif italic text-3xl text-white relative z-10 tracking-tighter">A</span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-white">
            ArthaOS
          </h1>
          <p className="text-muted-foreground text-lg font-light tracking-wide">
            Enterprise Retail Engine
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          className="mt-16 w-full"
        >
          {token ? (
            <div className="p-[1px] rounded-2xl bg-gradient-to-b from-white/10 to-transparent w-full">
              <div className="bg-card backdrop-blur-xl border border-card-border rounded-2xl p-6 sm:p-8 w-full text-left shadow-glass">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Lock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sesi Aktif</p>
                    <p className="text-white font-medium">{user?.email}</p>
                  </div>
                </div>

                <Link href="/dashboard" className="block w-full">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full relative group overflow-hidden bg-white text-black py-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <span className="relative z-10">Masuk ke Ruang Kerja</span>
                    <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </Link>
                
                {activeStore && (
                  <div className="mt-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      Toko terhubung: <span className="text-white/80">{activeStore.name}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full">
              <Link href="/login" className="w-full sm:w-auto">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto bg-white text-black px-8 py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2"
                >
                  Otorisasi Sistem
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
              <Link href="/register" className="w-full sm:w-auto">
                <motion.button 
                  whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.08)" }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto border border-white/10 bg-white/5 text-white px-8 py-3.5 rounded-xl font-medium text-sm transition-colors"
                >
                  Registrasi Akses
                </motion.button>
              </Link>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Luxury Minimal Footer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        className="absolute bottom-8 left-0 right-0 text-center"
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
          Secure Environment &bull; ArthaOS Core
        </p>
      </motion.div>
    </div>
  );
}

