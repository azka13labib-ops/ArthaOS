#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "         ArthaOS Automated Verification (artha-verify)    "
echo "=========================================================="

FAILED=0

# 1. Multi-Tenant Isolation
echo -e "\n[1/6] Scanning Multi-Tenant Isolation..."
LEAKS=$(git grep -nE "func \([^)]+\) GetByID\([^)]*\)" internal/repository/ | grep -v "store_repository.go" | grep -v "user_repository.go" | grep -v "storeID" | grep -v "store_id" || true)
if [ -n "$LEAKS" ]; then
    echo "  [FAIL] Ditemukan query GetByID tanpa store_id:"
    echo "$LEAKS"
    FAILED=$((FAILED + 1))
else
    echo "  [PASS] Multi-tenant isolation aman."
fi

# 2. Em Dash
echo -e "\n[2/6] Scanning Anti-Slop (Em Dash)..."
EM_DASH=$(git grep -nE "—|&mdash;|\\\u2014" web/src/ || true)
if [ -n "$EM_DASH" ]; then
    echo "  [FAIL] Ditemukan em dash di UI:"
    echo "$EM_DASH"
    FAILED=$((FAILED + 1))
else
    echo "  [PASS] Bersih dari em dash."
fi

# 3. Native alert / confirm
echo -e "\n[3/6] Scanning Native Dialogs (alert / confirm)..."
ALERTS=$(git grep -nE "\b(window\.)?(alert|confirm)\(" web/src/ || true)
if [ -n "$ALERTS" ]; then
    echo "  [WARN] Ditemukan alert() / confirm() native:"
    echo "$ALERTS"
    FAILED=$((FAILED + 1))
else
    echo "  [PASS] Bersih dari dialog native."
fi

# 4. Hardcoded styles
echo -e "\n[4/6] Scanning Hardcoded Colors (Dark Mode Safety)..."
COLORS=$(git grep -nE "\b(bg-white|bg-slate-100|text-black)\b" web/src/app/ || true)
if [ -n "$COLORS" ]; then
    echo "  [WARN] Ditemukan class warna hardcoded:"
    echo "$COLORS"
else
    echo "  [PASS] Tidak ada class warna hardcoded."
fi

# 5. Build & Test Gates
echo -e "\n[5/6] Executing Backend Build & Tests..."
go build ./cmd/api
go test -v ./internal/services/...

echo -e "\n[6/6] Executing Frontend Build..."
npm --prefix web run build

echo "=========================================================="
if [ $FAILED -eq 0 ]; then
    echo "   SELURUH VERIFIKASI LULUS!   "
else
    echo "   VERIFIKASI SELESAI DENGAN TEMUAN.   "
fi
echo "=========================================================="
