# Plan: LLM Lab – ALIFT 2026

## Fase 0 – Setup & Scaffold
**Goal**: folder structure, tooling, routing siap. Zero content, zero backend.

### Langkah
1. Init Vite + React + TypeScript: `npm create vite@latest client -- --template react-ts`
2. Install deps frontend:
   - `tailwindcss`, `@tailwindcss/vite`
   - `react-router-dom`
   - `js-tiktoken`
   - `lucide-react` (ikon)
   - `recharts` (bar chart modul 2)
3. Init backend: `mkdir server && cd server && npm init -y`
4. Install deps backend:
   - `express`, `cors`, `dotenv`
   - `node-fetch` atau pakai native fetch (Node 18+)
5. Buat `.env.example` dan tambah `.env` ke `.gitignore`
6. Buat struktur folder:

```
simulation/
├── client/
│   ├── src/
│   │   ├── components/        # shared UI
│   │   ├── modules/           # satu folder per modul
│   │   │   ├── 01-token/
│   │   │   ├── 02-temperature/
│   │   │   ├── 03-system-prompt/
│   │   │   ├── 04-context/
│   │   │   ├── 05-api-anatomy/
│   │   │   ├── 06-arena/
│   │   │   ├── 07-structured-output/
│   │   │   ├── 08-tool-calling/
│   │   │   └── 09-summary/
│   │   ├── data/              # JSON simulasi
│   │   ├── hooks/             # custom hooks (useProvider, useStream, dll)
│   │   ├── store/             # state global (mode, provider)
│   │   └── App.tsx
├── server/
│   ├── index.js
│   ├── routes/
│   │   ├── chat.js
│   │   └── health.js
│   └── adapters/
│       ├── cloud.js
│       └── local.js
├── .env.example
└── plan.md
```

7. Buat layout shell: Header (toggle mode, provider picker, status lamps), Sidebar (nav 9 modul), main content area.
8. React Router: 9 route `/modul/1` s/d `/modul/9`, keyboard nav `← →`.
9. Stub semua modul (judul + placeholder "segera hadir").
10. Tema terang/gelap (Tailwind `dark:`), tombol toggle.
11. Tombol "Mode Presentasi": font besar, sidebar hidden, kontras tinggi.

**Done ketika**: `npm run dev` jalan, 9 modul bisa dinagivasi, tidak ada error.

---

## Fase 1 – Data Simulasi & Modul 1–5 (Frontend Only)
**Goal**: semua modul berfungsi penuh di mode simulasi. Tidak butuh internet.

### Data (`src/data/`)
- `menu.json` – daftar menu kantin, stok, harga
- `sim-token.json` – contoh token splits untuk modul 1
- `sim-logprobs.json` – logit contoh untuk modul 2
- `sim-responses.json` – respons rekaman untuk modul 3–8 (cloud & lokal, lengkap TTFT tiruan)

### Modul 1 – Token
- Textarea → tokenize pakai `js-tiktoken`
- Chip berwarna selang-seling
- Counter: token, kata, karakter
- 4 tombol contoh (EN, ID, "mempertanggungjawabkan", pesanan kantin)
- Estimasi biaya input (pakai harga dari env/config, bisa diubah)
- Kotak Aha!

### Modul 2 – Temperature
- Data: `sim-logprobs.json` (5–8 kandidat token + logit)
- Bar chart Recharts
- Slider temperature 0–2 → softmax real-time → bar chart update
- Tombol: "Sampling 1 token", "Generate 10 token", "Ulangi 5x"
- Animasi token dipilih satu per satu
- Kotak Aha!

### Modul 3 – System Prompt
- Pertanyaan user + 3 kolom (CS formal, teman santai, bot terbatas topik)
- System prompt editable per kolom
- Seksi "Coba bobol botnya" – contoh serangan + respons simulasi
- Kotak Aha!

### Modul 4 – Context
- Dua panel chat (kiri tanpa riwayat, kanan dengan riwayat)
- Skenario built-in: "Nama saya Rina" → "Siapa nama saya?"
- Tampilkan array `messages` yang dikirim, tumbuh per turn
- Slider context window kecil → pesan lama greyed out
- Kotak Aha!

### Modul 5 – Anatomi API
- Display request (method, URL, header masking, body JSON)
- Display response JSON – klik bagian untuk penjelasan
- Perbandingan OpenAI vs Ollama (only URL & model beda)
- Tab code: curl, Python, JS (tombol copy)
- Kotak Aha!

### Modul 6 – Arena (skeleton)
- Layout dua/tiga kolom
- Set uji siap pakai (tombol) – mode simulasi pakai data rekaman
- Mode Tebak Buta – acak label, tombol "Buka identitas"
- Papan skor (akumulasi sesi ini)
- Diagram animasi privasi & offline
- Tabel trade-off statis
- Kotak Aha!

### Modul 7 – Structured Output
- 3 contoh pesan ambigu
- Kiri: respons teks bebas (simulasi)
- Kanan: respons JSON schema + validasi ✅/❌ + render kartu pesanan
- Tampilkan schema JSON
- Kotak Aha!

### Modul 8 – Tool Calling
- Skenario A: tanpa tools → model menebak
- Skenario B: diagram alur animasi (User→LLM→Tool→LLM→Jawaban), tombol "Langkah berikutnya"
- Setiap langkah tampilkan JSON
- Kotak Aha!

### Modul 9 – Rangkuman
- Diagram arsitektur Bot Kantin
- Teaser RAG

**Done ketika**: semua modul interaktif di mode simulasi, label "data simulasi" muncul, tidak ada error.

---

## Fase 2 – Backend & Mode Live Cloud
**Goal**: Express server jalan, bisa panggil OpenAI, mode live Cloud berfungsi.

### Backend
1. `server/index.js` – Express, CORS, dotenv
2. `server/adapters/cloud.js`:
   - Pakai `CLOUD_BASE_URL`, `CLOUD_API_KEY`, `CLOUD_MODEL`
   - Support: messages, system, temperature, logprobs, json_schema, tools, streaming (SSE)
   - `stream_options: { include_usage: true }` untuk token count
   - Tangkap error "parameter tidak didukung" → respons pesan edukatif
3. `server/routes/chat.js` – endpoint `/api/chat` (provider, model opsional, semua param)
4. `server/routes/health.js` – endpoint `/api/health`:
   - Cek API key OpenAI valid (call ringan)
   - Respons JSON: `{ cloud: { ok, error }, local: { ok, error } }`
5. Status lamps di header: poll `/api/health` tiap 30 detik

### Frontend – Mode Live
1. `useStream` hook: SSE consumer, parse delta, hitung TTFT & total waktu
2. Metrik respons: model, provider, TTFT, total waktu, token/detik, token in/out, biaya USD & IDR
3. Toggle Simulasi/Live di header → switch data source semua modul
4. Modul 2 live: logprobs dari `CLOUD_MODEL_LOGPROBS`
5. Modul 3 live: 3 kolom paralel ke cloud
6. Modul 4 live: chat panels ke cloud
7. Modul 7 live: structured output ke cloud
8. Modul 8 live: tool calling ke cloud (tool execution di frontend, multi-turn)

**Done ketika**: mode live Cloud berfungsi, error tertangkap dengan pesan edukatif, tidak ada error.

---

## Fase 3 – Mode Live Lokal (Ollama)
**Goal**: adapter Ollama jalan, semua modul bisa ke lokal.

### Backend
1. `server/adapters/local.js`:
   - Pakai `OLLAMA_BASE_URL`, format OpenAI-compatible `/v1/chat/completions`
   - Thinking toggle: kirim param disable thinking jika toggle mati (Qwen3 specific)
   - Tangkap error tools tidak didukung → pesan edukatif
2. Endpoint `/api/health` update: cek Ollama aktif, cek model sudah di-pull
3. Dropdown model di UI: fetch `/api/tags` dari Ollama → daftar model
4. Toggle "Tampilkan proses berpikir":
   - Mati (default): disable thinking, perbandingan kecepatan adil
   - Hidup: kotak thinking terpisah yang bisa dilipat

### Frontend
1. Provider picker: ☁️ Cloud / 💻 Lokal / ⚖️ Keduanya
2. Semua modul mode lokal
3. "Catatan Pemateri" per modul (buka/tutup)

**Done ketika**: mode lokal berfungsi, health check akurat, tidak ada error.

---

## Fase 4 – Mode Keduanya & Arena Lengkap
**Goal**: perbandingan paralel cloud vs lokal, modul 6 penuh.

### Backend
- `/api/chat` terima `provider: "both"` → fire paralel ke cloud dan lokal, stream dua SSE

### Frontend
1. Layout dua kolom otomatis saat mode Keduanya (modul 2, 3, 4, 7, 8)
2. Satu provider mati → kolom error, kolom lain tetap jalan
3. Modul 6 Arena lengkap:
   - "Jalankan Semua" – semua set uji paralel
   - Mode Tebak Buta + acak posisi kolom
   - "Ulangi 10x" konsistensi → skor berhasil
   - Papan skor akumulasi

**Done ketika**: mode Keduanya berfungsi, Arena lengkap, tidak ada error.

---

## Fase 5 – Polish & README
**Goal**: production-ready untuk workshop.

1. Responsif sampai 1366×768
2. Semua aset dibundel lokal (font, ikon, library) – tidak ada CDN request
3. `README.md` Bahasa Indonesia:
   - Install & run
   - Isi `.env` + cara dapat API key OpenAI
   - Install Ollama + `ollama pull qwen3:8b` + `ollama pull qwen3:4b`
   - Tabel RAM: 8GB → qwen3:1.7b/gemma4:e2b; 16GB → qwen3:4b/qwen3:8b/gemma4:e4b
   - Cara ganti data contoh
   - Checklist sebelum presentasi
4. Checklist final:
   - [ ] Mode simulasi jalan tanpa internet
   - [ ] `.env` tidak di-commit
   - [ ] Semua error tertangkap dengan pesan edukatif
   - [ ] Label "data simulasi" muncul di mode simulasi
   - [ ] Mode Presentasi berfungsi
   - [ ] Keyboard nav `← →` berfungsi
   - [ ] Tema gelap/terang berfungsi

---

## Urutan Eksekusi

| Fase | Perkiraan scope | Depends on |
|------|----------------|------------|
| 0 | Scaffold + routing | – |
| 1 | 9 modul simulasi | Fase 0 |
| 2 | Backend + live Cloud | Fase 1 |
| 3 | Live Lokal | Fase 2 |
| 4 | Mode Keduanya + Arena | Fase 3 |
| 5 | Polish + README | Fase 4 |

Mulai dari Fase 0. Konfirmasi setelah tiap fase sebelum lanjut.
