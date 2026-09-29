# 🧪 LLM Lab – ALIFT 2026

Aplikasi web interaktif untuk workshop "ALIFT 2026 – Get Ready for AGI", Tahap 2: "Make AI Respond".

Memvisualisasikan cara kerja LLM langkah demi langkah: dari tokenisasi hingga tool calling, dengan dukungan model cloud (OpenAI) dan model lokal (Ollama).

---

## Prasyarat

- **Node.js** v18 atau lebih baru
- **npm** v9 atau lebih baru

---

## Instalasi & Menjalankan

```bash
# 1. Clone atau download project
cd simulation

# 2. Install semua dependency (root + client + server)
npm install
npm install --prefix client
npm install --prefix server

# 3. Salin file konfigurasi
cp .env.example .env

# 4. Edit .env (lihat bagian Konfigurasi di bawah)
# Minimal isi CLOUD_API_KEY jika mau mode live cloud

# 5. Jalankan aplikasi (client + server sekaligus)
npm run dev
```

Buka browser: **http://localhost:5173**

Server backend berjalan di http://localhost:3001 (tidak perlu dibuka langsung).

---

## Konfigurasi `.env`

Salin `.env.example` ke `.env` lalu isi sesuai kebutuhan:

```env
# OpenAI (cloud) — untuk mode Live Cloud
CLOUD_BASE_URL=https://api.openai.com/v1
CLOUD_API_KEY=sk-...         ← WAJIB untuk mode live cloud
CLOUD_MODEL=gpt-4o           ← model utama (modul 3–8)
CLOUD_MODEL_LOGPROBS=gpt-4o-mini  ← model non-reasoning (modul 2)
CLOUD_PRICE_INPUT_PER_1M=2.50    ← harga input per 1M token (USD)
CLOUD_PRICE_OUTPUT_PER_1M=10.00  ← harga output per 1M token (USD)
USD_TO_IDR=16000

# Ollama (lokal) — untuk mode Live Lokal
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b        ← model utama lokal
OLLAMA_MODEL_SMALL=qwen3:4b  ← model kecil untuk pembanding
```

### Cara mendapatkan API key OpenAI

1. Buka https://platform.openai.com/api-keys
2. Klik "Create new secret key"
3. Salin key (hanya muncul sekali) dan isi di `.env`

### Harga model OpenAI (cek harga terbaru di https://openai.com/pricing)

| Model | Input (per 1M token) | Output (per 1M token) |
|-------|---------------------|----------------------|
| gpt-4o | $2.50 | $10.00 |
| gpt-4o-mini | $0.15 | $0.60 |

---

## Instalasi Ollama (Model Lokal)

### 1. Install Ollama

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# atau download dari https://ollama.com/download
```

### 2. Jalankan Ollama

```bash
ollama serve
```

### 3. Download model

```bash
# Model utama (direkomendasikan)
ollama pull qwen3:8b

# Model pembanding (lebih kecil, lebih cepat)
ollama pull qwen3:4b
```

### Rekomendasi model berdasarkan RAM

| RAM Laptop | Model Rekomendasi | Ukuran |
|------------|-------------------|--------|
| 8 GB | `qwen3:1.7b` atau `gemma3:1b` | ~1–2 GB |
| 8 GB | `qwen3:4b` | ~2.3 GB |
| 16 GB | `qwen3:8b` ✅ Rekomendasi utama | ~5 GB |
| 16 GB | `gemma3:4b` | ~3 GB |
| 32 GB+ | `qwen3:14b` atau `gemma3:12b` | ~9–8 GB |

> **Catatan**: Qwen3 mendukung toggle "Tampilkan proses berpikir" di header aplikasi.

---

## Cara Mengganti Data Contoh

Semua data simulasi ada di folder `client/src/data/`:

| File | Isi | Dipakai di |
|------|-----|------------|
| `menu.json` | Menu kantin, stok, harga | Modul 8 (cek stok) |
| `sim-logprobs.json` | Kandidat token untuk visualisasi | Modul 2 (Temperature) |
| `sim-arena.json` | Respons rekaman perbandingan | Modul 6 (Arena) |

Cukup edit file JSON sesuai kebutuhan, aplikasi langsung menggunakan data baru setelah refresh.

---

## Checklist Sebelum Presentasi

### H-1 (hari sebelum)

- [ ] Jalankan `npm run dev` dan pastikan tidak ada error
- [ ] Buka semua 9 modul di mode Simulasi — pastikan semua interaktif
- [ ] Isi `.env` dengan API key OpenAI yang valid
- [ ] Jalankan `ollama pull qwen3:8b` (butuh ~5 GB unduhan)
- [ ] Test mode Live Cloud: ketik di Modul 3, pastikan respons muncul
- [ ] Test mode Live Lokal: jalankan `ollama serve`, test di Modul 4
- [ ] Cek lampu status di header: Cloud ● hijau dan Lokal ● hijau

### Saat presentasi

- [ ] Matikan notifikasi laptop (Do Not Disturb)
- [ ] Sambungkan ke proyektor, pastikan resolusi minimal 1366×768
- [ ] Buka aplikasi di browser full-screen (F11)
- [ ] Aktifkan "Mode Presentasi" (ikon monitor di header) untuk font lebih besar
- [ ] Pastikan Ollama berjalan (`ollama serve`) untuk demo offline

### Demo offline (Modul 6 – Arena)

1. Jalankan test "Sapaan singkat" di mode Live, provider Keduanya
2. Matikan Wi-Fi
3. Jalankan ulang — Cloud gagal (merah), Lokal tetap jalan (hijau)
4. Nyalakan kembali Wi-Fi

### Jika ada masalah

| Masalah | Solusi |
|---------|--------|
| Lampu Cloud merah | Cek `CLOUD_API_KEY` di `.env`, cek koneksi internet |
| Lampu Lokal merah | Jalankan `ollama serve` di terminal baru |
| Model Ollama tidak ada | Jalankan `ollama pull qwen3:8b` |
| Aplikasi tidak muncul | Pastikan `npm run dev` berjalan, buka http://localhost:5173 |

---

## Struktur Project

```
simulation/
├── client/              # Frontend React + TypeScript
│   └── src/
│       ├── components/  # Komponen UI shared
│       ├── data/        # Data simulasi (JSON)
│       ├── hooks/       # Custom hooks (useStream, useBothStream)
│       ├── modules/     # 9 modul pembelajaran
│       └── store/       # State global (Zustand)
├── server/              # Backend Express (proxy ke LLM)
│   ├── adapters/        # cloud.js, local.js
│   └── routes/          # chat.js, health.js
├── .env.example         # Template konfigurasi
└── README.md
```

---

## Navigasi Keyboard

- `←` / `→` — pindah antar modul
- Klik ikon **Monitor** di header — Mode Presentasi (font besar, sidebar tersembunyi)
- Klik ikon **Bulan/Matahari** — toggle tema gelap/terang
