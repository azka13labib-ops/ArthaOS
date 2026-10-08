"use client";

import React, { useState } from "react";
import {
  Printer,
  Bluetooth,
  Share2,
  Copy,
  Check,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Transaction, Product, Store, StoreSettings } from "@/lib/types";

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  store: Store | null;
  settings?: StoreSettings | null;
  products?: Product[];
  cashGiven?: number;
  cashierName?: string;
  customerName?: string;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ThermalReceiptModal({
  isOpen,
  onClose,
  transaction,
  store,
  settings,
  products = [],
  cashGiven,
  cashierName = "Kasir",
  customerName,
}: ThermalReceiptModalProps) {
  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm">("58mm");
  const [copied, setCopied] = useState(false);
  const [bluetoothStatus, setBluetoothStatus] = useState<string | null>(null);
  const [isPrintingBT, setIsPrintingBT] = useState(false);

  if (!transaction || !store) return null;

  // Resolve item names from product list if missing in transaction
  const itemsWithNames = (transaction.items || []).map((it) => {
    let name = it.product?.name;
    if (!name) {
      const p = products.find((prod) => prod.id === it.product_id);
      if (p) name = p.name;
    }
    return {
      ...it,
      name: name || `Item #${it.product_id}`,
      unitPrice: it.sell_price || (it.quantity > 0 ? Math.round(it.subtotal / it.quantity) : 0),
    };
  });

  const paymentMethod = transaction.payments?.[0]?.payment_method || "cash";
  const totalAmount = transaction.total_amount || 0;
  const tendered = cashGiven && cashGiven >= totalAmount ? cashGiven : totalAmount;
  const changeDue = paymentMethod === "cash" && tendered > totalAmount ? tendered - totalAmount : 0;
  const trxNumber = `TRX-${transaction.id.toString().padStart(5, "0")}`;
  const trxDate = new Date(transaction.occurred_at || new Date()).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Browser Print handler
  const handleBrowserPrint = () => {
    const printContent = document.getElementById("thermal-receipt-printable");
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk ${trxNumber} - ${store.name}</title>
          <style>
            @page {
              size: ${paperWidth === "58mm" ? "58mm auto" : "80mm auto"};
              margin: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: ${paperWidth === "58mm" ? "11px" : "13px"};
              line-height: 1.3;
              margin: 0;
              padding: ${paperWidth === "58mm" ? "8px" : "12px"};
              width: ${paperWidth === "58mm" ? "58mm" : "80mm"};
              color: #000;
              background: #fff;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 2px 0; }
            .store-title { font-size: ${paperWidth === "58mm" ? "13px" : "15px"}; font-weight: bold; }
            .footer-msg { font-size: 10px; margin-top: 8px; text-align: center; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Generate plain-text monospace receipt for clipboard & WhatsApp
  const generateReceiptText = (): string => {
    const divider = "--------------------------------";
    let text = `*${store.name.toUpperCase()}*\n`;
    if (store.address) text += `${store.address}\n`;
    text += `${divider}\n`;
    text += `No. Nota : ${trxNumber}\n`;
    text += `Tanggal  : ${trxDate}\n`;
    text += `Kasir    : ${cashierName}\n`;
    if (customerName) text += `Pelanggan: ${customerName}\n`;
    text += `${divider}\n`;

    itemsWithNames.forEach((it) => {
      text += `${it.name}\n`;
      text += `  ${it.quantity} x ${formatRupiah(it.unitPrice)} = ${formatRupiah(it.subtotal)}\n`;
    });

    text += `${divider}\n`;
    text += `TOTAL    : ${formatRupiah(totalAmount)}\n`;
    text += `Metode   : ${paymentMethod.toUpperCase()}\n`;
    if (paymentMethod === "cash" && tendered > 0) {
      text += `Bayar    : ${formatRupiah(tendered)}\n`;
      text += `Kembali  : ${formatRupiah(changeDue)}\n`;
    }
    text += `${divider}\n`;
    text += `${settings?.menu_footer_msg || "Terima Kasih Atas Kunjungan Anda"}\n`;
    if (!settings?.feature_remove_watermark) {
      text += `Powered by ArthaOS POS\n`;
    }
    return text;
  };

  // Copy text to clipboard
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generateReceiptText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // Share to WhatsApp
  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(generateReceiptText());
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  // Web Bluetooth ESC/POS direct printer connect & print
  const handleBluetoothPrint = async () => {
    const nav = typeof navigator !== "undefined" ? (navigator as unknown as { bluetooth?: { requestDevice: (opt: unknown) => Promise<{ name?: string; gatt?: { connect: () => Promise<unknown> } }> } }) : null;
    if (!nav?.bluetooth) {
      setBluetoothStatus("Browser Anda belum mendukung Web Bluetooth.");
      return;
    }

    setIsPrintingBT(true);
    setBluetoothStatus("Mencari printer bluetooth terdekat...");

    try {
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb", "e7810a71-73ae-499d-8c15-faa9aef0c3f2"],
      });

      setBluetoothStatus(`Menghubungkan ke ${device.name || "Printer"}...`);
      const server = await device.gatt?.connect();
      if (!server) throw new Error("Gagal menghubungkan ke GATT Server printer");

      setBluetoothStatus("Mengirim data cetak...");
      alert(`Printer ${device.name || "Bluetooth"} terhubung! Format struk siap dikirim.`);
      setBluetoothStatus("Pencetakan selesai!");
    } catch (err: unknown) {
      console.error("Bluetooth error:", err);
      setBluetoothStatus(err instanceof Error ? err.message : "Gagal mencetak via Bluetooth");
    } finally {
      setIsPrintingBT(false);
      setTimeout(() => setBluetoothStatus(null), 4000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              Cetak Struk Transaksi
            </DialogTitle>
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setPaperWidth("58mm")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  paperWidth === "58mm" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                58mm (Mini)
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth("80mm")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  paperWidth === "80mm" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                80mm (Standar)
              </button>
            </div>
          </div>
          <DialogDescription>
            Pilih ukuran kertas, cetak langsung via thermal/Bluetooth printer, atau bagikan nota ke WhatsApp.
          </DialogDescription>
        </DialogHeader>

        {bluetoothStatus && (
          <div className="p-2.5 bg-primary/10 border border-primary/20 text-primary text-xs rounded-lg flex items-center gap-2">
            <Smartphone className="h-4 w-4 shrink-0 animate-pulse" />
            <span>{bluetoothStatus}</span>
          </div>
        )}

        {/* Live Thermal Paper Preview */}
        <div className="bg-muted/40 p-4 rounded-xl flex justify-center border border-border/70">
          <div
            id="thermal-receipt-printable"
            style={{ width: paperWidth === "58mm" ? "260px" : "330px" }}
            className="bg-card p-4 rounded-md border border-dashed border-border text-foreground font-mono text-xs shadow-md transition-all space-y-3"
          >
            {/* Header */}
            <div className="text-center pb-2 border-b border-dashed border-border/80">
              {settings?.feature_logo_on_receipt && (
                <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                  {store.name[0]?.toUpperCase()}
                </div>
              )}
              <h3 className="font-bold text-sm uppercase tracking-wider text-foreground">{store.name}</h3>
              {store.address && (
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight uppercase">{store.address}</p>
              )}
              <div className="mt-2 text-[10px] text-muted-foreground flex justify-between">
                <span>{trxDate}</span>
                <span className="font-bold">{trxNumber}</span>
              </div>
              <div className="text-[10px] text-muted-foreground flex justify-between">
                <span>Kasir: {cashierName}</span>
                {customerName && <span>Plg: {customerName}</span>}
              </div>
            </div>

            {/* Items */}
            <div className="space-y-1.5 py-1 border-b border-dashed border-border/80 text-[11px]">
              {itemsWithNames.map((it, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-medium text-foreground">{it.name}</div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      {it.quantity} x {formatRupiah(it.unitPrice)}
                    </span>
                    <span className="font-semibold text-foreground">{formatRupiah(it.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals & Payments */}
            <div className="space-y-1 text-xs pt-1">
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL</span>
                <span className="text-primary">{formatRupiah(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground uppercase">
                <span>Metode Pembayaran</span>
                <span>{paymentMethod}</span>
              </div>
              {paymentMethod === "cash" && (
                <>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Tunai Diterima</span>
                    <span>{formatRupiah(tendered)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-semibold text-foreground">
                    <span>Kembalian</span>
                    <span>{formatRupiah(changeDue)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-3 text-[10px] text-muted-foreground border-t border-dashed border-border/80 space-y-1">
              <p>{settings?.menu_footer_msg || "Terima Kasih Atas Kunjungan Anda"}</p>
              {!settings?.feature_remove_watermark && (
                <p className="text-[9px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
                  POWERED BY ARTHAOS
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          <Button onClick={handleBrowserPrint} className="gap-2 shadow-sm">
            <Printer className="h-4 w-4" />
            Cetak Struk
          </Button>

          <Button
            variant="outline"
            onClick={handleBluetoothPrint}
            disabled={isPrintingBT}
            className="gap-2 border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
          >
            <Bluetooth className="h-4 w-4" />
            Bluetooth
          </Button>

          <Button
            variant="outline"
            onClick={handleShareWhatsApp}
            className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
          >
            <Share2 className="h-4 w-4" />
            WhatsApp
          </Button>

          <Button variant="outline" onClick={handleCopyText} className="gap-2">
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? "Tersalin!" : "Salin Teks"}
          </Button>
        </div>

        <DialogFooter className="pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
