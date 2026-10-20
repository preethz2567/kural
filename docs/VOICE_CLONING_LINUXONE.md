# Kural Voice Cloning Microservice — IBM LinuxONE (s390x) Deployment Guide

This guide contains **exact, step-by-step instructions** to deploy the persistent 24/7 Voice Cloning Microservice on an **IBM LinuxONE (s390x)** virtual machine or any Linux server.

---

## ⚡ Quick Summary for Haripriya

If Haripriya has an IBM LinuxONE instance, she can give this document to her **Antigravity agent** or run the following two commands in her Linux terminal:

```bash
git pull origin main
cd services/voice_cloning_linuxone
chmod +x start_linuxone.sh
./start_linuxone.sh
```

The script will automatically install all dependencies, start the microservice on port 8000, and print the exact URL to share back with Preethi!

---

## 📋 Complete Step-by-Step Instructions

### Step 1: Pull the Latest Repository Code
SSH into the IBM LinuxONE instance and ensure the repository is up to date:
```bash
git clone https://github.com/preethz2567/kural.git
# Or if already cloned:
cd kural
git pull origin main
```

---

### Step 2: Navigate to the LinuxONE Service Directory
```bash
cd services/voice_cloning_linuxone
```

This directory contains:
- `server.py`: The standalone FastAPI voice cloning service.
- `requirements.txt`: Python dependencies.
- `start_linuxone.sh`: 1-click startup script.
- `test_service.py`: Verification diagnostic tool.
- `Dockerfile`: Container image for Docker/Podman on s390x.

---

### Step 3: Run the 1-Click Launch Script
Make the script executable and run it:
```bash
chmod +x start_linuxone.sh
./start_linuxone.sh
```

**What the script does automatically:**
1. Installs system audio codecs (`ffmpeg`, `libsndfile1`, `gcc`, `g++`).
2. Creates an isolated Python virtual environment (`venv`).
3. Installs Python packages (`fastapi`, `uvicorn`, `soundfile`, `edge-tts`, etc.).
4. Detects the server's public IP address.
5. Launches the Uvicorn server on `0.0.0.0:8000`.

---

### Step 4: Verify the Service is Healthy
Open a second terminal on the LinuxONE instance and run the self-diagnostic test:
```bash
cd services/voice_cloning_linuxone
source venv/bin/activate
python test_service.py
```

Expected output:
```text
Testing Kural Voice Cloning Microservice at http://localhost:8000...

[1/3] Testing GET http://localhost:8000/health...
      ✓ Health OK: status=ready, arch=s390x, engine=neural-calibrated-linuxone-s390x
[2/3] Testing POST http://localhost:8000/v1/clone-voice...
      ✓ Voice Clone Enrollment OK: voice_id=voice_test_patient_meera
[3/3] Testing POST http://localhost:8000/v1/synthesize-speech...
      ✓ Speech Synthesis OK: content_type=audio/mpeg, audio_len=27648 bytes

--------------------------------------------------------------
  ✓ ALL 3 ENDPOINTS OPERATIONAL AND READY!
--------------------------------------------------------------
```

---

### Step 5: How Haripriya Obtains the Public URL

Depending on the network configuration of the LinuxONE server:

#### Option A: Direct Public IP (Default)
If the LinuxONE instance has a public IP address (and incoming traffic on port 8000 is allowed by the cloud firewall/security group):
```bash
curl -s https://api.ipify.org
```
Example Output: `148.100.88.25`  
The public URL will be: **`http://148.100.88.25:8000`**

#### Option B: Cloudflare Tunnel (If port 8000 is behind an IBM firewall or NAT)
If incoming port 8000 is blocked by a firewall, Haripriya can expose it in 10 seconds via Cloudflare:
```bash
# Install cloudflared (Linux)
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb || sudo apt-get install -f

# Start the tunnel
cloudflared tunnel --url http://localhost:8000
```
Cloudflare will output a public HTTPS URL like:
```text
https://brave-maroon-clouds.trycloudflare.com
```

---

### Step 6: What Haripriya Sends to Preethi
Haripriya sends one single string to Preethi:
```text
VOICE_CLONING_SERVICE_URL=http://<LINUXONE_IP>:8000
# (or the https://....trycloudflare.com URL if using Cloudflare tunnel)
```

---

### Step 7: How Preethi Connects Kural to Haripriya's LinuxONE Server

Once Preethi receives Haripriya's URL:
1. Open [backend/.env](file:///c:/Users/D%20PREETHI%20D%20RAMYA/OneDrive/Desktop/D%20PREETHI/Projects/Kural/backend/.env).
2. Paste the URL:
   ```env
   VOICE_CLONING_SERVICE_URL=http://<HARIPRIYA_LINUXONE_IP>:8000
   VOICE_CLONING_TIMEOUT_SEC=3.5
   ```
3. Save the file.
4. Kural's FastAPI backend will instantly route all caregiver voice cloning and speech synthesis to Haripriya's LinuxONE server!

---

## 🛡️ Fallback Guarantee
If Haripriya's server ever restarts for maintenance or updates:
- Kural will **never freeze or crash**.
- Kural's backend automatically falls back to its built-in high-speed Edge neural engine (`ta-IN-PallaviNeural` / `en-IN-NeerjaExpressiveNeural`), guaranteeing continuous, unhurried companionship for the elder.
- The moment Haripriya's LinuxONE service is back online, XTTS voice cloning resumes seamlessly.
