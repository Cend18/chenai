# Chenai — Gemini multimodal

Proyek latihan berdasarkan **Sesi 2 - Materi Developers**, Hacktiv8, 68 halaman. Use case: asisten belajar teknis. Setiap permintaan berdiri sendiri, bukan percakapan dengan memori.

## Jalankan (Node.js 22+; diuji Node.js 24)
1. Jalankan `npm ci` di folder proyek.
2. Salin `.env.example` menjadi `.env`. Isi `GEMINI_API_KEY` dari https://aistudio.google.com/api-keys secara lokal. Jangan kirim key lewat chat atau commit ke Git.
3. Jalankan `npm start`, lalu buka http://127.0.0.1:3000.
4. Setelah mengubah `.env`, restart server.

Model default `gemini-2.5-flash` mengikuti materi. Jika tidak tersedia bagi akun Anda, ubah `GEMINI_MODEL` ke model multimodal yang tersedia di Google AI Studio. Key belum tersedia saat proyek dibuat; hasil AI nyata belum diverifikasi. `configured: true` hanya menunjukkan key terisi, bukan koneksi/key berhasil diuji.

## Pemetaan materi
| Materi | Implementasi |
|---|---|
| Hal. 19–21, 30–35: Node, SDK, ES Modules, dotenv | `package.json`, `index.js`, `.env.example` |
| Hal. 39–41: teks | `POST /generate-text`, JSON `{ "prompt": "Jelaskan OOP" }` |
| Hal. 43–45: gambar | `POST /generate-from-image`, multipart `image` + `prompt` |
| Hal. 47–49: dokumen | `POST /generate-from-document`, multipart `document` + `prompt` |
| Hal. 52–54: audio | `POST /generate-from-audio`, multipart `audio` + `prompt` |
| Hal. 56: buffer/Base64/inlineData | Multer memory storage; file tidak ditulis ke disk |
| Hal. 26, 62, 67: UI dan pengumpulan | `public/`, tangkapan layar dan publikasi GitHub setelah verifikasi |

Semua endpoint menerima `style` (`formal`/`santai`) dan `temperature` (0–2). System instruction fokus edukasi; output maksimum 4096 token. Sukses `{ "result": "..." }`; error `{ "code": "...", "message": "...", "requestId": "..." }`.

## Koreksi materi
- Hal. 34 menggunakan `GEMINI_API_KEY`, hal. 35 `API_KEY`: nama utama `GEMINI_API_KEY`; alias lama tetap diterima.
- Hal. 54 menulis field `document` untuk audio; field utama `audio`, alias `document` diterima, maksimum satu file.
- `multer()` tanpa destination memakai memori, bukan folder uploads (hal. 32/64 bertentangan dengan kode dan hal. 56).
- TXT UTF-8 dikirim sebagai text part; PDF sebagai inlineData. DOCX tidak diterima langsung; ekspor ke PDF dulu.
- Bagian berjudul File API pada hal. 56 sebenarnya memakai inlineData, bukan layanan `ai.files.upload`. Proyek mengikuti contoh inlineData; lifecycle remote Files API tidak ditambahkan.
- `package-lock.json` tetap disertakan supaya `npm ci` reproducible; berbeda dari anjuran hal. 61.
- Versi Node minimum disesuaikan SDK modern, bukan lagi Node 18.

## Batas dan keamanan
- Lokal saja: server bind `127.0.0.1`, bukan siap deploy publik. Tambahkan autentikasi, HTTPS, dan limit per pengguna sebelum deployment.
- Maksimum satu file 10 MiB; prompt maksimum 10.000 karakter. PNG/JPEG/WebP, PDF/TXT UTF-8, MP3/WAV.
- Validasi MIME dan signature dasar bukan pemeriksaan malware/decode lengkap. Gemini dapat menolak file rusak.
- Limit lokal 60 POST/menit dan 5 permintaan aktif. Timeout SDK 60 detik. Tidak ada retry otomatis yang dapat menggandakan biaya.
- API key hanya server. Output UI memakai textContent, bukan HTML dari AI.
- Prompt dan file dikirim ke Google saat menekan kirim. Hindari data rahasia. Tidak ada database atau penyimpanan riwayat aplikasi; kebijakan retensi Google tetap berlaku.

## Pengujian
`npm test` menguji HTTP lokal, parsing multipart, validasi, error, dan UI. Respons provider pada tes adalah **test double berlabel**, bukan bukti Gemini berhasil.

`npm audit --omit=dev` memeriksa dependency yang terpasang.

Import `postman_collection.json`, gunakan baseUrl `http://127.0.0.1:3000`. Pilih file lokal pada setiap field File. Coba masing-masing endpoint dengan API key sebelum mengambil screenshot jawaban nyata atau mengumpulkan tugas.

## Pengumpulan
Materi meminta URL repository GitHub dan screenshot UI. Folder ini belum dipublikasikan otomatis. Jangan unggah `.env`, node_modules, atau dokumen pribadi. Screenshot kondisi awal bukan bukti jawaban Gemini berhasil.

## Referensi resmi
- https://ai.google.dev/gemini-api/docs/generate-content/get-started
- https://ai.google.dev/gemini-api/docs/generate-content/document-processing
- https://ai.google.dev/gemini-api/docs/files
