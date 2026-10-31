# Chenai — Multimodal AI Assistant & Chatbot

Chenai adalah aplikasi web dan RESTful API berbasis kecerdasan buatan (*multimodal AI*) yang didukung oleh **Google Gemini 2.5 Flash** dan **Node.js (Express)**. Aplikasi ini memungkinkan pengguna untuk berinteraksi secara cerdas menggunakan berbagai jenis input: teks, gambar, dokumen, serta rekaman audio, dengan antarmuka web modern bertema **Claymorphism**.

---

## 🌟 Fitur Utama

- **💬 Asisten Cerdas Multimodal**:
  - **Teks**: Eksplorasi konsep, pemecahan masalah kode, dan tanya jawab interaktif.
  - **Gambar**: Analisis visual, ekstraksi informasi, dan deskripsi grafis (PNG, JPEG, WebP).
  - **Dokumen**: Pemahaman dan ringkasan berkas PDF & TXT (UTF-8).
  - **Audio**: Transkripsi dan analisis rekaman suara (MP3, WAV).
  - **Chatbot API**: Endpoint percakapan multi-turn dengan riwayat obrolan (*conversation history*).
- **🎨 Antarmuka Claymorphism**: Tampilan web taktil, lembut, dan elegan dengan efek 3D clay, responsif di berbagai perangkat, serta bebas XSS.
- **⚡ Kinerja Cepat & Efisien**: Menggunakan model `gemini-2.5-flash` dengan latensi rendah melalui SDK resmi `@google/genai`.
- **🛡️ Aman & Handal**:
  - Pemrosesan berkas langsung di memori (*in-memory buffer*) menggunakan Multer tanpa jejak di penyimpanan disk lokal.
  - Validasi *binary signature* (*magic bytes*) untuk mencegah pemalsuan tipe berkas (*file tampering*).
  - Perlindungan terhadap kebocoran API Key dan pesan error upstream yang disanitasi.
  - Dilengkapi *Rate Limiting* lokal, *Origin header validation*, dan *Content Security Policy* (CSP).

---

## 🛠️ Prasyarat & Instalasi

### 1. Prasyarat
- **Node.js** v20 atau lebih baru (direkomendasikan v22+)
- **NPM** (bawaan dari instalasi Node.js)
- **Google Gemini API Key** (dapat dibuat secara gratis melalui [Google AI Studio](https://aistudio.google.com/api-keys))

### 2. Kloning & Instal Dependensi
```bash
git clone https://github.com/<username-anda>/<nama-repo>.git
cd <nama-repo>
npm install
```

### 3. Konfigurasi Lingkungan (.env)
Salin berkas contoh konfigurasi:
```bash
cp .env.example .env
```
Buka berkas `.env` lalu masukkan API Key Gemini Anda:
```env
GEMINI_API_KEY=AIzaSy... (masukkan API key Anda di sini)
GEMINI_MODEL=gemini-2.5-flash
PORT=3000
```
> **Catatan Keamanan**: Berkas `.env` telah tercatat di `.gitignore` sehingga tidak akan terunggah ke repositori publik.

---

## 🚀 Menjalankan Aplikasi

Jalankan server aplikasi:
```bash
npm start
```
Atau secara langsung:
```bash
node index.js
```

Buka peramban (*browser*) dan akses:
```
http://127.0.0.1:3000
```

---

## 📡 Dokumentasi Endpoint REST API

Semua endpoint menerima parameter kustomisasi kreativitas:
- `style`: `"formal"` atau `"santai"` (default: `"formal"`)
- `temperature`: Nilai `0.0` sampai `2.0` (default: `0.4`)

| Endpoint | Method | Tipe Konten | Parameter / Form Field | Deskripsi |
|---|---|---|---|---|
| `/health` | `GET` | - | - | Status kesehatan server dan konfigurasi API key |
| `/api/chat` | `POST` | `application/json` | `{ "conversation": [...] }` | Percakapan multi-turn chatbot interaktif |
| `/generate-text` | `POST` | `application/json` | `{ "prompt": "..." }` | Menghasilkan respons berbasis prompt teks |
| `/generate-from-image` | `POST` | `multipart/form-data` | `image` (file) + `prompt` (opsional) | Analisis dan deskripsi gambar |
| `/generate-from-document`| `POST` | `multipart/form-data` | `document` (file) + `prompt` (opsional) | Ringkasan berkas PDF / TXT |
| `/generate-from-audio` | `POST` | `multipart/form-data` | `audio` (file) + `prompt` (opsional) | Transkripsi & telaah berkas audio |

### Contoh Request: Chatbot Multi-Turn (`POST /api/chat`)
```json
{
  "conversation": [
    { "role": "user", "text": "Apa keunggulan arsitektur REST API?" },
    { "role": "model", "text": "REST API bersifat stateless, scalable, dan memanfaatkan protokol standar HTTP." },
    { "role": "user", "text": "Bisa berikan contoh struktur URL yang baik?" }
  ]
}
```

### Format Response Sukses:
```json
{
  "result": "Jawaban dari Gemini AI..."
}
```

### Format Response Error:
```json
{
  "code": "INVALID_PROMPT",
  "message": "Prompt wajib berupa teks, maksimum 10.000 karakter; mode teks tidak boleh kosong.",
  "requestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
}
```

---

## 🧪 Pengujian Unit & Integrasi

Aplikasi ini dilengkapi dengan rangkaian pengujian otomatis (*unit & security test suite*) tanpa dependensi eksternal tambahan menggunakan test runner bawaan Node.js:

```bash
node --test test/*.test.js
```

Cakupan pengujian meliputi:
- ✅ Integritas seluruh endpoint API & parsing multipart
- ✅ Validasi batas ukuran file (maksimal 10 MiB)
- ✅ Validasi signature biner & penolakan file palsu
- ✅ Pencegahan kebocoran kredensial dan penanganan error
- ✅ Aksesibilitas, respon layout, dan proteksi XSS pada tampilan web

---

## 📁 Struktur Direktori

```text
├── index.js                  # Entry point Express API & integrasi Gemini SDK
├── package.json              # Dependensi dan script project
├── public/                   # Frontend Web Test Bench (Claymorphism UI)
│   ├── index.html            # Antarmuka web utama
│   ├── app.js                # Interaksi DOM, request handler, dan sanitasi
│   ├── style.css             # Desain antarmuka bertema Claymorphism
│   └── hero.png              # Ilustrasi visual header
├── test/                     # Rangkaian pengujian otomatis
│   ├── api.test.js           # Pengujian fungsionalitas endpoint
│   ├── security.test.js      # Pengujian keamanan, rate limit, dan validasi
│   └── ui.test.js            # Pengujian DOM, markup, dan aksesibilitas
├── postman_collection.json   # Koleksi Postman untuk pengujian manual
└── README.md                 # Dokumentasi proyek
```

---

## 📜 Lisensi

Proyek ini dirilis di bawah lisensi [ISC](LICENSE).
