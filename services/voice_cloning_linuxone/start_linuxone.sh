#!/usr/bin/env bash
# ==============================================================================
# Kural Voice Cloning Microservice — 1-Click Launch on IBM LinuxONE / Linux
# ==============================================================================

set -e

echo "======================================================================"
echo "  🌸 Kural Voice Cloning Service — IBM LinuxONE (s390x) / Linux Deploy"
echo "======================================================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. System packages check (Ubuntu/Debian/RHEL/SUSE)
if command -v apt-get &> /dev/null; then
    echo "[1/5] Checking system dependencies (ffmpeg, libsndfile1)..."
    sudo apt-get update -qq || true
    sudo apt-get install -y -qq ffmpeg libsndfile1 gcc g++ python3-venv python3-pip curl || true
elif command -v yum &> /dev/null; then
    echo "[1/5] Checking system dependencies via yum..."
    sudo yum install -y ffmpeg libsndfile gcc gcc-c++ python3-pip curl || true
fi

# 2. Virtual environment setup
echo "[2/5] Setting up Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate

# 3. Pip dependencies installation
echo "[3/5] Installing Python dependencies..."
pip install --upgrade pip -q
pip install -r requirements.txt -q

# 4. Detect IP Address
echo "[4/5] Detecting server network endpoint..."
PUBLIC_IP=$(curl -s --max-time 3 https://api.ipify.org || curl -s --max-time 3 https://ifconfig.me || hostname -I | awk '{print $1}')
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")

echo ""
echo "======================================================================"
echo "  🚀 SERVER READY TO START ON PORT 8000"
echo "======================================================================"
echo "  Local URL:   http://localhost:8000"
echo "  LAN URL:     http://${LOCAL_IP}:8000"
echo "  Public URL:  http://${PUBLIC_IP}:8000"
echo ""
echo "  📋 SEND THIS EXACT LINE TO PREETHI TO PUT IN HER backend/.env:"
echo "  ----------------------------------------------------------------"
echo "  VOICE_CLONING_SERVICE_URL=http://${PUBLIC_IP}:8000"
echo "  ----------------------------------------------------------------"
echo ""
echo "  (Tip: If your cloud firewall blocks incoming port 8000, run:"
echo "   cloudflared tunnel --url http://localhost:8000"
echo "   and send the resulting https://....trycloudflare.com URL instead!)"
echo "======================================================================"
echo ""
echo "[5/5] Starting Uvicorn server..."
exec uvicorn server:app --host 0.0.0.0 --port 8000
