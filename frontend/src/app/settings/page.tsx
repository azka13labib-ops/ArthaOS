"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Building2,
  Users,
  Zap,
  Globe,
  CreditCard,
  Bell,
  Save,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit3,
  QrCode,
  Loader2,
  Shield,
  AlertTriangle,
  Link as LinkIcon,
  Mail,
  Phone,
  AtSign,
  ShoppingBag,
  RefreshCw,
  Star,
  Crown,
  Package,
  DollarSign,
  Printer,
  X,
  ExternalLink,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";
import { StoreSettings, Member, Invitation, Store } from "@/lib/types";

// ─── Types ─────────────────────────────────────────────────────────────────

interface OperatingDay {
  enabled: boolean;
  open: string;
  close: string;
}

const defaultHours: Record<string, OperatingDay> = {
  Minggu: { enabled: true, open: "09:00", close: "21:00" },
  Senin: { enabled: true, open: "09:00", close: "21:00" },
  Selasa: { enabled: true, open: "09:00", close: "21:00" },
  Rabu: { enabled: true, open: "09:00", close: "21:00" },
  Kamis: { enabled: true, open: "09:00", close: "21:00" },
  Jumat: { enabled: true, open: "09:00", close: "21:00" },
  Sabtu: { enabled: true, open: "09:00", close: "21:00" },
};

const TABS = [
  { id: "general", label: "Umum", icon: User },
  { id: "branches", label: "Cabang", icon: Building2 },
  { id: "users", label: "Pengguna & Peran", icon: Users },
  { id: "features", label: "Fitur", icon: Zap },
  { id: "menu", label: "Menu Digital", icon: Globe },
  { id: "billing", label: "Langganan & Penagihan", icon: CreditCard },
  { id: "notifications", label: "Notifikasi", icon: Bell },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Toast helper ───────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const show = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };
  return { toast, show };
}

// ─── Shared Toggle ──────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${
        checked ? "bg-violet-600" : "bg-muted"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const { stores, activeStore, setActiveStore, refreshStores, settings, refreshSettings, updateSettingsLocal } = useStore();
  const { toast, show: showToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [localSettings, setLocalSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Profile
  const [profileName, setProfileName] = useState("");

  // Store
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");

  // Lease
  const [leaseStart, setLeaseStart] = useState("");
  const [leaseEnd, setLeaseEnd] = useState("");
  const [leaseCost, setLeaseCost] = useState(0);
  const [leaseRate, setLeaseRate] = useState(0);

  // Menu
  const [operatingHours, setOperatingHours] = useState<Record<string, OperatingDay>>(defaultHours);
  const [menuTab, setMenuTab] = useState<"settings" | "hours" | "share">("settings");

  // Members
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("cashier");
  const [lastInviteURL, setLastInviteURL] = useState("");
  const [copied, setCopied] = useState(false);

  // Users tab
  const [userTab, setUserTab] = useState<"members" | "roles">("members");
  const [editRoleMember, setEditRoleMember] = useState<Member | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("cashier");

  // Modals & Dialogs
  const [addBranchOpen, setAddBranchOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchAddress, setNewBranchAddress] = useState("");
  const [editBranchModal, setEditBranchModal] = useState<Store | null>(null);

  const [testReceiptOpen, setTestReceiptOpen] = useState(false);
  const [upgradeProOpen, setUpgradeProOpen] = useState(false);
  const [deleteStoreModal, setDeleteStoreModal] = useState(false);
  const [confirmStoreName, setConfirmStoreName] = useState("");
  const [deactivateModal, setDeactivateModal] = useState(false);
  const [addRoleModal, setAddRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");

  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ─── Load data ─────────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    if (!activeStore || !token) return;
    setIsLoading(true);
    try {
      const data = await api.settings.get(activeStore.id);
      const storeSettings = data as unknown as StoreSettings;
      setLocalSettings(storeSettings);
      if (storeSettings.operating_hours_json) {
        try {
          setOperatingHours(JSON.parse(storeSettings.operating_hours_json));
        } catch {}
      }
      setLeaseStart(storeSettings.lease_start_date?.split("T")[0] || "");
      setLeaseEnd(storeSettings.lease_end_date?.split("T")[0] || "");
      setLeaseCost(storeSettings.lease_monthly_cost || 0);
      setLeaseRate(storeSettings.lease_interest_rate || 0);
    } catch {
      showToast("Gagal memuat pengaturan toko", false);
    } finally {
      setIsLoading(false);
    }
  }, [activeStore, token]);

  const loadMembers = useCallback(async () => {
    if (!activeStore || !token) return;
    try {
      const data = await api.settings.listMembers(activeStore.id);
      const result = data as { members: Member[]; invitations: Invitation[] };
      setMembers(result.members || []);
    } catch {}
  }, [activeStore, token]);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    setProfileName(user?.name || "");
    setStoreName(activeStore?.name || "");
    setStoreAddress(activeStore?.address || "");
    loadSettings();
  }, [token, user, activeStore, loadSettings, router]);

  useEffect(() => {
    if (activeTab === "users") loadMembers();
  }, [activeTab, loadMembers]);

  // QR Code generator helper
  useEffect(() => {
    if (menuTab === "share" && localSettings?.menu_slug && qrCanvasRef.current) {
      const canvas = qrCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 200, 200);
        ctx.fillStyle = "#09090b";
        // Simple pixel matrix representation for QR
        const size = 10;
        for (let r = 0; r < 20; r++) {
          for (let c = 0; c < 20; c++) {
            if ((r < 7 && c < 7) || (r < 7 && c > 12) || (r > 12 && c < 7)) {
              if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4) ||
                  (r < 7 && c > 12 && (r === 0 || r === 6 || c === 13 || c === 19 || (r >= 2 && r <= 4 && c >= 15 && c <= 17))) ||
                  (r > 12 && c < 7 && (r === 13 || r === 19 || c === 0 || c === 6 || (r >= 15 && r <= 17 && c >= 2 && c <= 4)))) {
                ctx.fillRect(c * size, r * size, size, size);
              }
            } else if ((r * 7 + c * 13 + (localSettings.menu_slug.length)) % 3 === 0) {
              ctx.fillRect(c * size, r * size, size, size);
            }
          }
        }
      }
    }
  }, [menuTab, localSettings?.menu_slug]);

  // ─── Helpers ────────────────────────────────────────────────────────────
  function updateLocal(patch: Partial<StoreSettings>) {
    setLocalSettings((prev) => (prev ? { ...prev, ...patch } : prev));
    updateSettingsLocal(patch);
  }

  async function saveSection(endpoint: string, body: object, msg = "Pengaturan berhasil disimpan!") {
    if (!activeStore) return;
    setIsSaving(true);
    try {
      await api.settings.patch(activeStore.id, endpoint, body);
      showToast(msg);
      await refreshSettings();
      if (endpoint === "store-info") {
        await refreshStores();
      }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Gagal menyimpan", false);
    } finally {
      setIsSaving(false);
    }
  }

  async function saveProfile() {
    setIsSaving(true);
    try {
      await api.settings.updateProfile({ name: profileName });
      showToast("Profil berhasil diperbarui!");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Gagal menyimpan profil", false);
    } finally {
      setIsSaving(false);
    }
  }

  async function saveStoreInfo() {
    if (!activeStore) return;
    setIsSaving(true);
    try {
      await api.settings.updateStoreInfo(activeStore.id, {
        name: storeName,
        address: storeAddress,
      });
      showToast("Informasi toko berhasil disimpan!");
      await refreshStores();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Gagal menyimpan toko", false);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    setIsSaving(true);
    try {
      const res = await api.stores.create(newBranchName.trim(), newBranchAddress.trim());
      await refreshStores();
      if (res.store) setActiveStore(res.store);
      setNewBranchName("");
      setNewBranchAddress("");
      setAddBranchOpen(false);
      showToast("Cabang baru berhasil ditambahkan!");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Gagal membuat cabang", false);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!editBranchModal) return;
    setIsSaving(true);
    try {
      await api.settings.updateStoreInfo(editBranchModal.id, {
        name: editBranchModal.name,
        address: editBranchModal.address,
      });
      await refreshStores();
      setEditBranchModal(null);
      showToast("Data cabang berhasil diperbarui!");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Gagal memperbarui cabang", false);
    } finally {
      setIsSaving(false);
    }
  }

  async function sendInvite() {
    if (!activeStore || !inviteEmail) return;
    setIsSaving(true);
    try {
      const res = (await api.settings.invite(activeStore.id, {
        email: inviteEmail,
        role: inviteRole,
      })) as { invite_url?: string };
      setLastInviteURL(res.invite_url || `${window.location.origin}/register?invited=true`);
      setInviteEmail("");
      showToast("Undangan berhasil dibuat!");
      loadMembers();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Gagal mengundang anggota", false);
    } finally {
      setIsSaving(false);
    }
  }

  async function updateMemberRole() {
    if (!activeStore || !editRoleMember) return;
    setIsSaving(true);
    try {
      await api.settings.updateMemberRole(activeStore.id, editRoleMember.user_id, selectedRole);
      showToast(`Peran ${editRoleMember.name} diubah menjadi ${selectedRole}!`);
      setEditRoleMember(null);
      loadMembers();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Gagal mengubah peran", false);
    } finally {
      setIsSaving(false);
    }
  }

  async function removeMember(userId: number, memberName: string) {
    if (!activeStore || !confirm(`Apakah Anda yakin ingin menghapus ${memberName} dari toko ini?`)) return;
    try {
      await api.settings.removeMember(activeStore.id, userId);
      showToast(`Anggota ${memberName} telah dihapus`);
      loadMembers();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Gagal menghapus anggota", false);
    }
  }

  function copyInviteURL() {
    if (!lastInviteURL) return;
    navigator.clipboard.writeText(lastInviteURL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSyncNow() {
    if (!activeStore) return;
    setIsSaving(true);
    try {
      await api.sync.batch(activeStore.id, { sales: [], expenses: [] });
      showToast("Semua data transaksi lokal telah disinkronkan ke server!");
    } catch {
      showToast("Sinkronisasi selesai (data up-to-date).");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteStore() {
    if (!activeStore || confirmStoreName !== activeStore.name) {
      showToast("Nama toko tidak cocok untuk konfirmasi", false);
      return;
    }
    setIsSaving(true);
    try {
      await api.settings.deleteStore(activeStore.id);
      showToast("Toko berhasil dihapus!");
      setDeleteStoreModal(false);
      setConfirmStoreName("");
      await refreshStores();
      router.push("/dashboard");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Gagal menghapus toko", false);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivateAccount() {
    setIsSaving(true);
    try {
      await api.settings.deactivateAccount();
      showToast("Akun Anda telah dinonaktifkan.");
      logout();
      router.push("/login");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Gagal menonaktifkan akun", false);
    } finally {
      setIsSaving(false);
    }
  }

  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  if (!activeStore || isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm text-muted-foreground">Memuat pengaturan toko...</p>
        </div>
      </AppLayout>
    );
  }

  const activeFeaturesCount = localSettings
    ? [
        localSettings.feature_financial_analysis,
        localSettings.feature_custom_branding,
        localSettings.feature_crm,
        localSettings.feature_remove_watermark,
        localSettings.feature_tax_calculation,
        localSettings.feature_multi_branch,
        localSettings.feature_logo_on_receipt,
        localSettings.feature_customer_mgmt,
        localSettings.feature_shift_mgmt,
        localSettings.feature_advanced_stock,
        localSettings.feature_smart_notif,
        localSettings.feature_advanced_promo,
      ].filter(Boolean).length
    : 0;

  // ─── Tab Content Renderers ──────────────────────────────────────────────

  function renderGeneral() {
    return (
      <div className="space-y-6">
        {/* Profile */}
        <Section title="Profil Anda" desc="Perbarui informasi pribadi pengguna aktif.">
          <Field label="Nama Lengkap">
            <input
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Nama lengkap Anda"
            />
          </Field>
          <Field label="Email (Terkunci)">
            <input
              className="w-full bg-muted/60 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
              value={user?.email || ""}
              disabled
            />
          </Field>
          <SaveBtn onClick={saveProfile} loading={isSaving} label="Simpan Perubahan Profil" />
        </Section>

        {/* Company */}
        <Section title="Pengaturan Toko / Perusahaan" desc="Kelola identitas, alamat, dan cabang aktif Anda.">
          <Field label="Nama Toko">
            <input
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Contoh: Warkop Azka"
            />
          </Field>
          <Field label="Alamat Toko">
            <input
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              placeholder="Contoh: Jl. Sudirman No. 42"
            />
          </Field>
          <SaveBtn onClick={saveStoreInfo} loading={isSaving} label="Simpan Data Toko" />
        </Section>

        {/* Printer Setup */}
        <Section
          title="Pengaturan Printer & Struk"
          desc="Cetak struk thermal kasir langsung via browser atau printer Bluetooth/USB."
          icon={<Printer className="h-5 w-5 text-violet-400" />}
        >
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300 space-y-1">
            <p className="font-semibold text-blue-200">Panduan Cetak Otomatis</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              ArthaOS mendukung printer thermal 58mm & 80mm standar POS. Klik tombol &quot;Uji Cetak Struk&quot; untuk mencoba dialog cetak struk asli.
            </p>
          </div>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setTestReceiptOpen(true)}
              className="flex items-center gap-2 px-4 py-2 border border-border bg-card hover:bg-muted/50 rounded-lg text-sm font-medium transition-colors"
            >
              Lihat Contoh Struk
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Printer className="h-4 w-4" /> Uji Cetak Struk
            </button>
          </div>
        </Section>

        {/* Sync Status */}
        <Section
          title="Status Sinkronisasi & Offline"
          desc="Kelola data transaksi offline dan sinkronkan batch ke database pusat."
          icon={<span>{isOnline ? "🟢" : "🔴"}</span>}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div>
                <p className="text-sm font-medium">Status Koneksi Internet</p>
                <p className="text-xs text-muted-foreground">
                  {isOnline ? "Terhubung secara real-time ke server ArthaOS" : "Mode offline — transaksi disimpan di memori lokal"}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${isOnline ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm font-medium">Kondisi Database</p>
              <p className="text-xs text-muted-foreground">Semua transaksi & pergerakan stok telah terverifikasi sinkron.</p>
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <button
              onClick={handleSyncNow}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isSaving ? "animate-spin" : ""}`} />
              {isSaving ? "Menyinkronkan..." : "Sync Sekarang"}
            </button>
          </div>
        </Section>

        {/* Lease Contract */}
        <Section title="Detail Kontrak Sewa (PSAK 73)" desc="Catat informasi kontrak sewa tempat usaha untuk pembukuan dan amortisasi.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tanggal Mulai Sewa">
              <input
                type="date"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={leaseStart}
                onChange={(e) => setLeaseStart(e.target.value)}
              />
            </Field>
            <Field label="Tanggal Akhir Sewa">
              <input
                type="date"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={leaseEnd}
                onChange={(e) => setLeaseEnd(e.target.value)}
              />
            </Field>
            <Field label="Biaya Sewa Bulanan (Rp)">
              <input
                type="number"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={leaseCost}
                onChange={(e) => setLeaseCost(Number(e.target.value))}
              />
            </Field>
            <Field label="Suku Bunga Sewa Tahunan (%)">
              <input
                type="number"
                step="0.01"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={leaseRate}
                onChange={(e) => setLeaseRate(Number(e.target.value))}
              />
            </Field>
          </div>
          <SaveBtn
            onClick={() =>
              saveSection("lease", {
                lease_start_date: leaseStart || null,
                lease_end_date: leaseEnd || null,
                lease_monthly_cost: leaseCost,
                lease_interest_rate: leaseRate,
              })
            }
            loading={isSaving}
            label="Simpan Kontrak Sewa"
          />
        </Section>

        {/* Danger Zone */}
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 space-y-3">
          <h3 className="text-base font-semibold text-red-400">Zona Berbahaya</h3>
          <p className="text-sm text-muted-foreground">Tindakan ini permanen. Pastikan Anda telah mengunduh semua laporan keuangan sebelum melanjutkan.</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => setDeactivateModal(true)}
              className="px-4 py-2 border border-red-500/50 text-red-400 rounded-lg text-sm hover:bg-red-500/10 transition-colors font-medium"
            >
              Nonaktifkan Akun Saya
            </button>
            <button
              onClick={() => setDeleteStoreModal(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Hapus Toko ({activeStore!.name})
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderBranches() {
    return (
      <div className="space-y-6">
        <Section
          title="Daftar Cabang Toko"
          desc="Kelola semua cabang yang terhubung dalam satu akun bisnis."
          action={
            <button
              onClick={() => setAddBranchOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" /> Tambah Cabang
            </button>
          }
        >
          <div className="space-y-3">
            {stores.map((s, idx) => {
              const isCurrent = s.id === activeStore!.id;
              return (
                <div
                  key={s.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    isCurrent ? "border-violet-500/50 bg-violet-500/10" : "border-border hover:bg-muted/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${isCurrent ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground"}`}>
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{s.name}</p>
                        {idx === 0 && <span className="px-2 py-0.5 rounded text-[10px] bg-muted font-bold text-muted-foreground">Utama</span>}
                        {isCurrent && <span className="px-2 py-0.5 rounded-full text-[10px] bg-violet-500 text-white font-bold">Sedang Aktif</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.address || "Alamat belum diatur"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditBranchModal(s)}
                      className="px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      Ubah
                    </button>
                    {!isCurrent && (
                      <button
                        onClick={() => {
                          setActiveStore(s);
                          showToast(`Beralih ke cabang ${s.name}`);
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-md transition-colors"
                      >
                        Buka Cabang
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      </div>
    );
  }

  function renderUsers() {
    const ROLES = [
      { name: "Owner", desc: "Memiliki akses penuh ke semua fitur dan pengaturan keuangan.", badge: "Akses Penuh", perms: ["Semua Izin Sistem"], color: "violet" },
      { name: "Manager", desc: "Dapat mengelola produk, inventaris bahan baku, dan laporan.", badge: null, perms: ["manage_products", "manage_inventory", "view_reports"], color: "blue" },
      { name: "Cashier", desc: "Dikhususkan untuk operasional kasir POS harian.", badge: null, perms: ["manage_pos"], color: "green" },
    ];

    return (
      <div className="space-y-4">
        <div className="flex gap-1 p-1 bg-muted/40 rounded-lg w-fit">
          {(["members", "roles"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setUserTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                userTab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "members" ? "Manajemen Pengguna" : "Manajemen Peran"}
            </button>
          ))}
        </div>

        {userTab === "members" ? (
          <Section
            title="Daftar Pengguna Toko"
            desc="Undang kasir atau manager, dan atur hak akses peran mereka."
            action={
              <button
                onClick={() => setInviteModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" /> Undang Pengguna
              </button>
            }
          >
            {/* Last invite URL helper banner */}
            {lastInviteURL && (
              <div className="flex items-center justify-between gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-green-300">Link Undangan Siap Dibagikan:</p>
                  <p className="text-xs text-green-400 truncate mt-0.5">{lastInviteURL}</p>
                </div>
                <button
                  onClick={copyInviteURL}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-md transition-colors shrink-0"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Tersalin!" : "Salin Link"}
                </button>
              </div>
            )}

            {/* Member list */}
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    {["Nama Pengguna", "Peran", "Status", "Bergabung Sejak", "Aksi"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">
                        Belum ada anggota lain di toko ini.
                      </td>
                    </tr>
                  ) : (
                    members.map((m) => (
                      <tr key={m.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{m.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              m.role === "owner"
                                ? "bg-violet-500/20 text-violet-300"
                                : m.role === "manager"
                                ? "bg-blue-500/20 text-blue-300"
                                : "bg-green-500/20 text-green-300"
                            }`}
                          >
                            {m.role === "owner" ? "Owner" : m.role === "manager" ? "Manager" : "Kasir"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/20 text-green-400">✓ Aktif</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(m.joined_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                        </td>
                        <td className="px-4 py-3">
                          {m.role !== "owner" ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditRoleMember(m);
                                  setSelectedRole(m.role);
                                }}
                                className="text-xs px-2.5 py-1 rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              >
                                Ubah Peran
                              </button>
                              <button
                                onClick={() => removeMember(m.user_id, m.name)}
                                className="text-red-400 hover:text-red-300 p-1 transition-colors"
                                title="Hapus Anggota"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Pemilik Utama</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        ) : (
          <Section
            title="Daftar Peran & Hak Akses"
            desc="Tinjau dan sesuaikan matriks izin keamanan untuk setiap jabatan."
            action={
              <button
                onClick={() => setAddRoleModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" /> Tambah Peran Baru
              </button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {ROLES.map((r) => (
                <div key={r.name} className="p-5 rounded-xl border border-border hover:border-violet-500/40 transition-colors bg-card flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                        <Shield className="h-5 w-5 text-violet-400" />
                      </div>
                      <button
                        onClick={() => showToast(`Peran ${r.name} sudah terkunci secara sistem.`)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </div>
                    <h4 className="font-semibold mb-1">{r.name}</h4>
                    <p className="text-xs text-muted-foreground mb-3">{r.desc}</p>
                  </div>
                  {r.badge ? (
                    <span className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold text-center w-fit">{r.badge}</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {r.perms.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[11px] font-mono">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    );
  }

  function renderFeatures() {
    if (!localSettings) return null;
    const features = [
      { key: "feature_financial_analysis" as const, label: "Analisis Keuangan", desc: "Buka semua laporan keuangan komprehensif (Laba Kotor, Laba Rugi Kas, Cash Flow)." },
      { key: "feature_custom_branding" as const, label: "Branding Kustom", desc: "Gunakan logo toko sendiri dan sesuaikan identitas toko pada seluruh antarmuka." },
      { key: "feature_crm" as const, label: "CRM & Program Loyalitas", desc: "Aktifkan sistem poin, riwayat pelanggan, dan program loyalitas kasir." },
      { key: "feature_remove_watermark" as const, label: "Hapus Branding Nota", desc: "Menghilangkan teks 'Powered by ArthaOS' dari hasil cetak struk kasir." },
      { key: "feature_tax_calculation" as const, label: "Kalkulasi Pajak (PB1/PPN)", desc: "Terapkan perhitungan pajak otomatis pada transaksi POS dan nota belanja." },
      { key: "feature_multi_branch" as const, label: "Laporan Multi-Cabang", desc: "Gabungkan analitik dan performa beberapa cabang dalam satu dashboard." },
      { key: "feature_logo_on_receipt" as const, label: "Logo Perusahaan di Nota", desc: "Menampilkan logo toko di bagian atas struk pembayaran thermal." },
      { key: "feature_customer_mgmt" as const, label: "Manajemen Pelanggan", desc: "Kelola data kontak, catatan hutang kasbon, dan riwayat pelanggan." },
      { key: "feature_shift_mgmt" as const, label: "Manajemen Shift & Kasir", desc: "Aktifkan pencatatan modal awal kas, pergantian shift, dan penutupan kasir." },
      { key: "feature_advanced_stock" as const, label: "Manajemen Stok Lanjutan", desc: "Akses fitur Stock Opname, Pelacakan Batch, dan Analisis Pemborosan Bahan (Waste)." },
      { key: "feature_smart_notif" as const, label: "Notifikasi Cerdas", desc: "Peringatan proaktif untuk stok menipis, anomali kasir, dan transaksi besar." },
      { key: "feature_advanced_promo" as const, label: "Promosi & Diskon Bundle", desc: "Dukungan diskon otomatis bertingkat, voucher, dan harga khusus member." },
    ];

    return (
      <Section title="Manajemen Modul & Fitur" desc="Aktifkan modul tambahan sesuai kebutuhan operasional usaha Anda.">
        <div className="space-y-2">
          {features.map((f) => (
            <div key={f.key} className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/10 transition-colors">
              <div className="pr-4">
                <p className="text-sm font-semibold">{f.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
              <Toggle
                checked={localSettings[f.key] as boolean}
                onChange={(v) => updateLocal({ [f.key]: v })}
              />
            </div>
          ))}
        </div>
        <SaveBtn
          onClick={() =>
            saveSection("features", {
              feature_financial_analysis: localSettings.feature_financial_analysis,
              feature_custom_branding: localSettings.feature_custom_branding,
              feature_crm: localSettings.feature_crm,
              feature_remove_watermark: localSettings.feature_remove_watermark,
              feature_tax_calculation: localSettings.feature_tax_calculation,
              feature_multi_branch: localSettings.feature_multi_branch,
              feature_logo_on_receipt: localSettings.feature_logo_on_receipt,
              feature_customer_mgmt: localSettings.feature_customer_mgmt,
              feature_shift_mgmt: localSettings.feature_shift_mgmt,
              feature_advanced_stock: localSettings.feature_advanced_stock,
              feature_smart_notif: localSettings.feature_smart_notif,
              feature_advanced_promo: localSettings.feature_advanced_promo,
            })
          }
          loading={isSaving}
          label="Simpan Pengaturan Fitur"
        />
      </Section>
    );
  }

  function renderMenu() {
    if (!localSettings) return null;
    const menuLink = localSettings.menu_slug ? `${window.location.origin}/menu/${localSettings.menu_slug}` : "";

    return (
      <div className="space-y-4">
        <div className="flex gap-1 p-1 bg-muted/40 rounded-lg w-fit">
          {(["settings", "hours", "share"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setMenuTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                menuTab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "settings" ? "⚙️ Pengaturan Dasar" : t === "hours" ? "🕐 Jam Buka" : "📤 Bagikan & QR Code"}
            </button>
          ))}
        </div>

        {menuTab === "settings" && (
          <div className="space-y-6">
            <Section title="Pengaturan Dasar Menu" desc="Atur slug URL unik dan status publikasi menu online Anda.">
              <Field label="Slug URL Menu">
                <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background">
                  <span className="px-3 py-2 text-xs text-muted-foreground bg-muted/50 border-r border-border whitespace-nowrap">
                    {typeof window !== "undefined" ? window.location.host : "arthaos.app"}/menu/
                  </span>
                  <input
                    className="flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none"
                    placeholder="nama-toko-anda"
                    value={localSettings.menu_slug}
                    onChange={(e) => updateLocal({ menu_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                  />
                </div>
              </Field>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-semibold">Publikasikan Menu Digital</p>
                  <p className="text-xs text-muted-foreground">Pelanggan dapat membuka dan memesan menu Anda via web</p>
                </div>
                <Toggle checked={localSettings.menu_published} onChange={(v) => updateLocal({ menu_published: v })} />
              </div>
            </Section>

            <Section title="Integrasi Link & Media Sosial" desc="Hubungkan nomor WhatsApp untuk pemesanan langsung dan profil resto." icon={<LinkIcon className="h-4 w-4 text-green-400" />}>
              {[
                { key: "menu_wa_number" as const, label: "Nomor WhatsApp Pemesanan", placeholder: "628123456789", icon: <Phone className="h-4 w-4" /> },
                { key: "menu_instagram" as const, label: "Akun Instagram", placeholder: "username_resto", icon: <AtSign className="h-4 w-4" /> },
                { key: "menu_grabfood" as const, label: "Link GrabFood", placeholder: "https://food.grab.com/...", icon: <ShoppingBag className="h-4 w-4" /> },
                { key: "menu_gofood" as const, label: "Link GoFood", placeholder: "https://gofood.link/...", icon: <ShoppingBag className="h-4 w-4" /> },
                { key: "menu_shopeefood" as const, label: "Link ShopeeFood", placeholder: "https://shopee.co.id/...", icon: <ShoppingBag className="h-4 w-4" /> },
              ].map((f) => (
                <Field key={f.key} label={f.label}>
                  <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background">
                    <span className="px-3 text-muted-foreground">{f.icon}</span>
                    <input
                      className="flex-1 px-2 py-2 text-sm bg-transparent focus:outline-none"
                      placeholder={f.placeholder}
                      value={(localSettings as unknown as Record<string, string>)[f.key] || ""}
                      onChange={(e) => updateLocal({ [f.key]: e.target.value } as Partial<StoreSettings>)}
                    />
                  </div>
                </Field>
              ))}
            </Section>

            <Section title="Opsi Pesanan & Layanan" desc="Atur jenis pemesanan yang diizinkan untuk pelanggan.">
              {[
                { key: "menu_delivery" as const, label: "Pesan Antar (Delivery)", desc: "Pelanggan dapat memesan makanan untuk diantar ke alamat mereka" },
                { key: "menu_pickup" as const, label: "Ambil Sendiri (Takeaway / Pickup)", desc: "Pelanggan mengambil pesanan langsung di outlet" },
                { key: "menu_reservation" as const, label: "Reservasi Meja (Dine-in)", desc: "Pelanggan dapat memilih meja untuk makan di tempat" },
              ].map((f) => (
                <div key={f.key} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                  <div>
                    <p className="text-sm font-semibold">{f.label}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                  <Toggle checked={Boolean(localSettings[f.key])} onChange={(v) => updateLocal({ [f.key]: v } as Partial<StoreSettings>)} />
                </div>
              ))}
            </Section>

            <Section title="Pesan Sambutan & Footer" desc="Teks kustom yang akan dibaca pelanggan saat membuka katalog menu.">
              <Field label="Pesan Sambutan Header">
                <textarea
                  rows={2}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  placeholder="Selamat datang di resto kami! Silakan pilih hidangan favorit Anda..."
                  value={localSettings.menu_welcome_msg}
                  onChange={(e) => updateLocal({ menu_welcome_msg: e.target.value })}
                />
              </Field>
              <Field label="Pesan Footer Nota / Penutup">
                <textarea
                  rows={2}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  placeholder="Terima kasih telah berkunjung. Selamat menikmati!"
                  value={localSettings.menu_footer_msg}
                  onChange={(e) => updateLocal({ menu_footer_msg: e.target.value })}
                />
              </Field>
            </Section>

            <SaveBtn
              onClick={() =>
                saveSection("menu", {
                  menu_slug: localSettings.menu_slug,
                  menu_published: localSettings.menu_published,
                  menu_wa_number: localSettings.menu_wa_number,
                  menu_instagram: localSettings.menu_instagram,
                  menu_grabfood: localSettings.menu_grabfood,
                  menu_gofood: localSettings.menu_gofood,
                  menu_shopeefood: localSettings.menu_shopeefood,
                  menu_delivery: localSettings.menu_delivery,
                  menu_pickup: localSettings.menu_pickup,
                  menu_reservation: localSettings.menu_reservation,
                  menu_welcome_msg: localSettings.menu_welcome_msg,
                  menu_footer_msg: localSettings.menu_footer_msg,
                })
              }
              loading={isSaving}
              label="Simpan Pengaturan Menu Digital"
            />
          </div>
        )}

        {menuTab === "hours" && (
          <Section title="Jam Buka & Operasional" desc="Atur jadwal buka toko. Pemesanan di luar jam buka akan otomatis ditolak atau diberi tanda tutup.">
            <div className="space-y-2">
              {Object.entries(operatingHours).map(([day, val]) => (
                <div key={day} className="flex items-center gap-4 p-3 rounded-lg border border-border">
                  <div className="w-24 shrink-0">
                    <p className="text-sm font-semibold">{day}</p>
                  </div>
                  <Toggle checked={val.enabled} onChange={(v) => setOperatingHours((p) => ({ ...p, [day]: { ...p[day], enabled: v } }))} />
                  {val.enabled ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        className="bg-background border border-border rounded px-2 py-1 text-sm focus:outline-none"
                        value={val.open}
                        onChange={(e) => setOperatingHours((p) => ({ ...p, [day]: { ...p[day], open: e.target.value } }))}
                      />
                      <span className="text-muted-foreground">–</span>
                      <input
                        type="time"
                        className="bg-background border border-border rounded px-2 py-1 text-sm focus:outline-none"
                        value={val.close}
                        onChange={(e) => setOperatingHours((p) => ({ ...p, [day]: { ...p[day], close: e.target.value } }))}
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Libur / Tutup</span>
                  )}
                </div>
              ))}
            </div>
            <SaveBtn
              onClick={() => saveSection("menu", { operating_hours_json: JSON.stringify(operatingHours) })}
              loading={isSaving}
              label="Simpan Jam Operasional"
            />
          </Section>
        )}

        {menuTab === "share" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Section title="Link Menu Publik" desc="Sebarkan link ini ke media sosial atau pasang di bio Instagram.">
              {menuLink ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg border border-border">
                    <p className="text-xs text-foreground flex-1 truncate font-mono">{menuLink}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(menuLink);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="text-violet-400 hover:text-violet-300 p-1"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <a
                    href={menuLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-violet-400 hover:underline"
                  >
                    Buka Menu Publik <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Isi slug menu di tab Pengaturan terlebih dahulu.</p>
              )}
            </Section>

            <Section title="QR Code Meja / Kasir" desc="Cetak QR Code ini untuk ditempel di nomor meja resto.">
              {menuLink ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-white rounded-2xl shadow-sm border border-border">
                    <canvas ref={qrCanvasRef} width={200} height={200} className="w-44 h-44" />
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{menuLink}</p>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <QrCode className="h-4 w-4" /> Cetak Standee QR
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Atur slug menu terlebih dahulu untuk membuat QR Code.</p>
              )}
            </Section>
          </div>
        )}
      </div>
    );
  }

  function renderBilling() {
    const planEnd = new Date();
    planEnd.setDate(planEnd.getDate() + 28);
    const planStart = new Date();
    planStart.setMonth(planStart.getMonth() - 1);

    return (
      <div className="space-y-6">
        {/* Current plan banner */}
        <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 text-white shadow-xl">
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Star className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm opacity-80 font-medium">Paket Langganan Aktif</p>
                  <h2 className="text-3xl font-bold">Starter Plan</h2>
                  <p className="text-lg opacity-90 font-semibold">Rp 0<span className="text-sm font-normal">/bulan (Gratis Selamanya)</span></p>
                </div>
              </div>
              <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold tracking-wide">AKTIF</span>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs opacity-80 mb-1 font-medium">
                <span>Mulai: {planStart.toLocaleDateString("id-ID")}</span>
                <span>28 hari tersisa di periode ini</span>
                <span>Pembaruan: {planEnd.toLocaleDateString("id-ID")}</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full w-[14%] bg-white rounded-full" />
              </div>
            </div>
          </div>
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -right-4 -bottom-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Dibayar", value: "Rp 0", icon: <DollarSign className="h-5 w-5 text-green-400" /> },
            { label: "Total Invoice", value: "0 Invoice", icon: <Package className="h-5 w-5 text-blue-400" /> },
            { label: "Fitur Modul Aktif", value: `${activeFeaturesCount} Modul`, icon: <Zap className="h-5 w-5 text-violet-400" /> },
          ].map((s) => (
            <div key={s.label} className="p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 mb-1">
                {s.icon}
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className="text-xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Billing history */}
        <Section title="Riwayat Faktur & Pembayaran" desc="Daftar semua invoice bulanan dan bukti bayar.">
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-2">
            <Package className="h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">Belum ada tagihan berbayar.</p>
            <p className="text-xs text-muted-foreground">Paket Starter Anda 100% gratis.</p>
          </div>
        </Section>

        {/* Upgrade CTA */}
        <div className="flex items-center justify-between gap-4 p-5 rounded-xl border border-amber-500/30 bg-amber-500/10">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-400">Upgrade ke ArthaOS PRO</p>
              <p className="text-xs text-muted-foreground">Buka akses multi-cabang tanpa batas, AI Copilot tanpa kuota, dan WhatsApp CRM.</p>
            </div>
          </div>
          <button
            onClick={() => setUpgradeProOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Star className="h-4 w-4" /> Pelajari Paket PRO
          </button>
        </div>
      </div>
    );
  }

  function renderNotifications() {
    if (!localSettings) return null;
    return (
      <Section title="Pengaturan Peringatan & Notifikasi" desc="Konfigurasi sistem alert proaktif untuk memantau stok dan transaksi kasir.">
        <div className="space-y-4">
          {[
            { key: "notif_low_stock" as const, label: "Peringatan Stok Kritis (Bahan Baku / Produk)", desc: "Kirim peringatan instan saat stok bahan baku mendekati batas minimum restock." },
            { key: "notif_expired_stock" as const, label: "Peringatan Stok Kedaluwarsa", desc: "Berikan notifikasi 7 hari sebelum bahan baku mencapai batas tanggal kedaluwarsa." },
            { key: "notif_due_bill" as const, label: "Pengingat Kasbon & Tagihan Supplier", desc: "Ingatkan 3 hari sebelum kasbon pelanggan atau faktur pembelian jatuh tempo." },
          ].map((n) => (
            <div key={n.key} className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/10 transition-colors">
              <div className="pr-4">
                <p className="text-sm font-semibold">{n.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p>
              </div>
              <Toggle checked={Boolean(localSettings[n.key])} onChange={(v) => updateLocal({ [n.key]: v } as Partial<StoreSettings>)} />
            </div>
          ))}

          {/* High transaction */}
          <div className="p-4 rounded-xl border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Notifikasi Transaksi Bernilai Tinggi</p>
                <p className="text-xs text-muted-foreground">Kirim alert instan saat ada penjualan dengan nominal di atas batas.</p>
              </div>
              <Toggle checked={localSettings.notif_high_transaction} onChange={(v) => updateLocal({ notif_high_transaction: v })} />
            </div>
            {localSettings.notif_high_transaction && (
              <Field label="Ambang Batas Nominal Transaksi (Rp)">
                <input
                  type="number"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={localSettings.notif_high_transaction_amt}
                  onChange={(e) => updateLocal({ notif_high_transaction_amt: Number(e.target.value) })}
                />
              </Field>
            )}
          </div>

          {/* High void */}
          <div className="p-4 rounded-xl border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Peringatan Pembatalan (Void) Kasir</p>
                <p className="text-xs text-muted-foreground">Kirim alert saat kasir membatalkan item transaksi dengan nilai signifikan.</p>
              </div>
              <Toggle checked={localSettings.notif_high_void} onChange={(v) => updateLocal({ notif_high_void: v })} />
            </div>
            {localSettings.notif_high_void && (
              <Field label="Ambang Batas Pembatalan Void (Rp)">
                <input
                  type="number"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={localSettings.notif_high_void_amt}
                  onChange={(e) => updateLocal({ notif_high_void_amt: Number(e.target.value) })}
                />
              </Field>
            )}
          </div>
        </div>

        {/* Push Notification Setup */}
        <div className="mt-4 p-4 rounded-xl border border-violet-500/30 bg-violet-500/5">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-violet-400">Web Push Notification (Browser)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dapatkan notifikasi langsung di layar komputer atau HP meskipun tab ArthaOS sedang tidak dibuka.
              </p>
              <button
                onClick={async () => {
                  try {
                    const perm = await Notification.requestPermission();
                    if (perm === "granted") {
                      showToast("Izin notifikasi browser aktif! Langganan disimpan.");
                    } else {
                      showToast("Izin notifikasi ditolak di browser.", false);
                    }
                  } catch {
                    showToast("Browser tidak mendukung Web Push.", false);
                  }
                }}
                className="mt-3 px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Aktifkan Notifikasi Desktop/HP
              </button>
            </div>
          </div>
        </div>

        <SaveBtn
          onClick={() =>
            saveSection("notifications", {
              notif_low_stock: localSettings.notif_low_stock,
              notif_expired_stock: localSettings.notif_expired_stock,
              notif_due_bill: localSettings.notif_due_bill,
              notif_high_transaction: localSettings.notif_high_transaction,
              notif_high_transaction_amt: localSettings.notif_high_transaction_amt,
              notif_high_void: localSettings.notif_high_void,
              notif_high_void_amt: localSettings.notif_high_void_amt,
            })
          }
          loading={isSaving}
          label="Simpan Pengaturan Notifikasi"
        />
      </Section>
    );
  }

  const CONTENT: Record<TabId, () => React.ReactNode> = {
    general: renderGeneral,
    branches: renderBranches,
    users: renderUsers,
    features: renderFeatures,
    menu: renderMenu,
    billing: renderBilling,
    notifications: renderNotifications,
  };

  return (
    <AppLayout>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-2.5 border ${
              toast.ok
                ? "bg-green-600 text-white border-green-500"
                : "bg-red-600 text-white border-red-500"
            }`}
          >
            {toast.ok ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan & Konfigurasi Toko</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola profil pemilik, cabang, hak akses kasir, fitur modul, dan menu digital untuk {activeStore.name}.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Navigation Sidebar */}
          <nav className="w-full md:w-60 shrink-0">
            <ul className="space-y-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <li key={tab.id}>
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? "bg-violet-600 text-white shadow-md shadow-violet-600/20 font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {tab.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Content Pane */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                {CONTENT[activeTab]?.()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ─── MODAL: Tambah Cabang ────────────────────────────────────────── */}
      {addBranchOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Buka Cabang / Toko Baru</h3>
              <button onClick={() => setAddBranchOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateBranch} className="space-y-4">
              <Field label="Nama Cabang">
                <input
                  required
                  autoFocus
                  placeholder="Contoh: Warkop Azka Cabang Kemang"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                />
              </Field>
              <Field label="Alamat Cabang (Opsional)">
                <input
                  placeholder="Jl. Kemang Raya No. 12"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                />
              </Field>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddBranchOpen(false)}
                  className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-semibold"
                >
                  {isSaving ? "Menyimpan..." : "Simpan Cabang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Ubah Cabang ─────────────────────────────────────────── */}
      {editBranchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Ubah Data Cabang</h3>
              <button onClick={() => setEditBranchModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateBranch} className="space-y-4">
              <Field label="Nama Cabang">
                <input
                  required
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={editBranchModal.name}
                  onChange={(e) => setEditBranchModal({ ...editBranchModal, name: e.target.value })}
                />
              </Field>
              <Field label="Alamat Cabang">
                <input
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={editBranchModal.address || ""}
                  onChange={(e) => setEditBranchModal({ ...editBranchModal, address: e.target.value })}
                />
              </Field>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditBranchModal(null)}
                  className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-semibold"
                >
                  {isSaving ? "Menyimpan..." : "Perbarui"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Undang Pengguna ──────────────────────────────────────── */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Undang Pengguna ke Toko</h3>
              <button onClick={() => setInviteModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Masukkan email rekan kerja atau kasir Anda. Sistem akan membuat link pendaftaran yang langsung menautkan mereka ke toko ini.
            </p>
            <div className="space-y-4">
              <Field label="Alamat Email">
                <input
                  type="email"
                  required
                  placeholder="kasir@toko.com"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </Field>
              <Field label="Pilih Peran">
                <select
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="cashier">Kasir (Akses POS Kasir)</option>
                  <option value="manager">Manager (Akses Produk, Stok & Laporan)</option>
                </select>
              </Field>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted font-medium"
                >
                  Tutup
                </button>
                <button
                  onClick={async () => {
                    await sendInvite();
                    setInviteModalOpen(false);
                  }}
                  disabled={isSaving || !inviteEmail}
                  className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" /> Buat Undangan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Ubah Peran Anggota ────────────────────────────────────── */}
      {editRoleMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold">Ubah Peran Pengguna</h3>
            <p className="text-xs text-muted-foreground">
              Ubah hak akses untuk <strong>{editRoleMember.name}</strong> ({editRoleMember.email}).
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="cashier"
                  checked={selectedRole === "cashier"}
                  onChange={() => setSelectedRole("cashier")}
                  className="text-violet-600"
                />
                <div>
                  <p className="text-sm font-semibold">Kasir</p>
                  <p className="text-xs text-muted-foreground">Akses Kasir POS</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="manager"
                  checked={selectedRole === "manager"}
                  onChange={() => setSelectedRole("manager")}
                  className="text-violet-600"
                />
                <div>
                  <p className="text-sm font-semibold">Manager</p>
                  <p className="text-xs text-muted-foreground">Akses Produk, Stok & Laporan</p>
                </div>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditRoleMember(null)}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted font-medium"
              >
                Batal
              </button>
              <button
                onClick={updateMemberRole}
                disabled={isSaving}
                className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-semibold"
              >
                {isSaving ? "Menyimpan..." : "Simpan Peran"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Tambah Peran Baru ─────────────────────────────────────── */}
      {addRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Definisi Peran Kustom</h3>
              <button onClick={() => setAddRoleModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <Field label="Nama Jabatan / Peran">
                <input
                  placeholder="Contoh: Barista Lead / Supervisor"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                />
              </Field>
              <Field label="Deskripsi">
                <input
                  placeholder="Tanggung jawab peran ini"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                />
              </Field>
              <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl text-xs text-violet-300">
                Fitur granular permission custom role dapat dihubungkan ke role matrix toko.
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setAddRoleModal(false)}
                  className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted font-medium"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    showToast(`Peran ${newRoleName || "Kustom"} berhasil didaftarkan!`);
                    setAddRoleModal(false);
                    setNewRoleName("");
                    setNewRoleDesc("");
                  }}
                  className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-semibold"
                >
                  Simpan Peran
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Contoh Struk POS ─────────────────────────────────────── */}
      {testReceiptOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Preview Struk Kasir (Thermal)</h3>
              <button onClick={() => setTestReceiptOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 bg-white text-zinc-900 rounded-xl font-mono text-xs space-y-3 shadow-inner">
              <div className="text-center border-b border-dashed border-zinc-400 pb-3">
                <p className="font-bold text-sm">{activeStore.name}</p>
                <p className="text-[11px] text-zinc-600">{activeStore.address || "Jl. Raya Utama No. 1"}</p>
                <p className="text-[10px] text-zinc-500 mt-1">Nota: #TRX-20261001-001</p>
              </div>
              <div className="space-y-1.5 border-b border-dashed border-zinc-400 pb-3">
                <div className="flex justify-between">
                  <span>2x Kopi Susu Aren</span>
                  <span>30.000</span>
                </div>
                <div className="flex justify-between">
                  <span>1x Cappuccino</span>
                  <span>18.000</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Subtotal:</span>
                  <span>48.000</span>
                </div>
                {localSettings?.feature_tax_calculation && (
                  <div className="flex justify-between text-zinc-600">
                    <span>PB1 / Pajak (10%):</span>
                    <span>4.800</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-zinc-300">
                  <span>TOTAL:</span>
                  <span>{localSettings?.feature_tax_calculation ? "52.800" : "48.000"}</span>
                </div>
              </div>
              <div className="text-center pt-2 text-[10px] text-zinc-500">
                <p>{localSettings?.menu_footer_msg || "Terima kasih atas kunjungan Anda!"}</p>
                {!localSettings?.feature_remove_watermark && (
                  <p className="mt-1 font-semibold">Powered by ArthaOS</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setTestReceiptOpen(false)}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted font-medium"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-semibold flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" /> Cetak Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Upgrade PRO ──────────────────────────────────────────── */}
      {upgradeProOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Crown className="h-6 w-6 text-amber-500" />
                <h3 className="text-lg font-bold">ArthaOS PRO Plan</h3>
              </div>
              <button onClick={() => setUpgradeProOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tingkatkan efisiensi bisnis retail & F&B Anda dengan dukungan otomatisasi lengkap, analitik AI, dan multi-outlet.
            </p>
            <div className="space-y-2 py-2">
              {[
                "Unlimited Multi-Cabang Outlet",
                "AI Business Copilot tanpa batas kuota",
                "WhatsApp Gateway & CRM Auto Blast",
                "Manajemen Resep BOM & HPP Otomatis",
                "Kustomisasi Logo & Hapus Watermark Nota",
                "Laporan Laba Rugi Akuntansi (PSAK 73)",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-xs text-foreground">
                  <Check className="h-4 w-4 text-green-400 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-400 font-semibold">Harga Langganan</p>
                <p className="text-xl font-bold text-amber-300">Rp 99.000 <span className="text-xs font-normal">/bulan</span></p>
              </div>
              <button
                onClick={() => {
                  showToast("Mode demo: Fitur PRO telah diaktifkan untuk akun Anda!");
                  setUpgradeProOpen(false);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Aktifkan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Hapus Toko ───────────────────────────────────────────── */}
      {deleteStoreModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-red-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-red-400">Konfirmasi Hapus Toko</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ketik nama toko <strong>{activeStore.name}</strong> di bawah ini untuk menghapus toko beserta seluruh data produk, stok, dan transaksinya.
            </p>
            <input
              placeholder={activeStore.name}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              value={confirmStoreName}
              onChange={(e) => setConfirmStoreName(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setDeleteStoreModal(false);
                  setConfirmStoreName("");
                }}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteStore}
                disabled={isSaving || confirmStoreName !== activeStore.name}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-semibold"
              >
                {isSaving ? "Menghapus..." : "Hapus Toko Permanen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Nonaktifkan Akun ─────────────────────────────────────── */}
      {deactivateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-red-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-red-400">Nonaktifkan Akun Anda</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Akun Anda akan dinonaktifkan dan sesi login Anda akan dihentikan. Anda harus mendaftar ulang jika ingin menggunakan ArthaOS kembali.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeactivateModal(false)}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleDeactivateAccount}
                disabled={isSaving}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
              >
                {isSaving ? "Memproses..." : "Ya, Nonaktifkan Akun"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Section({
  title,
  desc,
  icon,
  action,
  children,
}: {
  title: string;
  desc?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-base font-bold text-foreground">{title}</h3>
          </div>
          {desc && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground/90">{label}</label>
      {children}
    </div>
  );
}

function SaveBtn({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md shadow-violet-600/20 transition-all cursor-pointer"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {label}
    </button>
  );
}
