# Implementation Plan: Hacktiv8 Sesi 2 — Gemini Flash Multimodal API & Study Assistant

## Overview
Membangun RESTful API menggunakan Node.js (Express, Multer, `@google/genai`, `dotenv`) sesuai materi Sesi 2 Hacktiv8 dengan model `gemini-2.5-flash`. Mendukung 4 endpoint multimodal (`/generate-text`, `/generate-from-image`, `/generate-from-document`, `/generate-from-audio`), ditambah konfigurasi parameter kreatif (use case: Asisten Belajar Teknis / Education Bot dengan pengaturan gaya bahasa & temperature) serta antarmuka web uji coba.

## Architecture Decisions
- **ES Modules (`"type": "module"`)**: Sesuai Slide 31.
- **Multer Memory Storage (`multer()`)**: Sesuai Slide 34, 43, 47, 52, 56 (`req.file.buffer.toString("base64")` sebagai `inlineData`).
- **Konsistensi Env Var**: Mendukung `GEMINI_API_KEY` (Slide 32 & 34) dengan fallback `API_KEY` (Slide 35).
- **Kompatibilitas Field Audio**: Menerima field `audio` (Slide 52) maupun `document` (Slide 54) agar pengujian Postman tidak gagal karena perbedaan slide.
- **Dependency Injection untuk TDD**: `createApp({ aiClient })` pada `index.js` agar endpoint dapat diuji secara deterministik sebelum dan sesudah integrasi Gemini API.

## Task List
- [x] Task 1: Inisialisasi proyek, dependencies, `.gitignore`, `.env.example`
- [x] Task 2: TDD Endpoint 1 (`POST /generate-text`) & validasi input
- [x] Task 3: TDD Endpoint 2 (`POST /generate-from-image`) & multimodal `inlineData`
- [x] Task 4: TDD Endpoint 3 (`POST /generate-from-document`) & default prompt ringkasan
- [x] Task 5: TDD Endpoint 4 (`POST /generate-from-audio`) & default prompt transkrip
- [x] Task 6: UI Web Asisten Belajar & dokumentasi `README.md` + `git init`

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| `GEMINI_API_KEY` belum diisi pengguna | High | Validasi awal + pesan error informatif & `.env.example` |
| Salah nama field form-data di Postman | Med | Middleware menerima field `audio` atau `document` pada endpoint audio |
