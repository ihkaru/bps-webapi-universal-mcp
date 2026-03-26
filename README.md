# BPS WebAPI MCP Server v2.3 (Agent-First)

Akses data statistik resmi BPS Indonesia secara cerdas menggunakan Model Context Protocol (MCP). Server ini dirancang khusus untuk **Asisten AI** agar dapat menarik data indikator strategi, PDRB, hingga komoditas pertanian dengan akurasi tinggi dan minim token usage.

## 🚀 Fitur Ungkapan (v2.3 - 2026 Ready)
- **`bps_query` Orchestration**: Satu tool untuk semua. Otomatis mencari domain, subjek, variabel, dan periode.
- **Domain Fallback**: Jika data kabupaten tidak ada, otomatis mencari ke domain provinsi.
- **Fuzzy Region Matching**: Mengenali "Mempawah" sebagai "Kab. Mempawah" secara otomatis.
- **2026 Protocol Spec**: Mendukung Bidirectional Sampling dan compliant dengan SDK v1.27.x.
- **Token Efficient**: Output berupa Markdown curated yang compact, menyisakan lebih banyak context untuk "otak" AI Anda.
- **Log Sanitization**: 100% Stderr logging (aman untuk Stdio transport).

## 🛠️ Instalasi
```bash
git clone ...
npm install
```

## ⚙️ Konfigurasi
Set environment variable `BPS_API_KEY` dengan API Key dari [webapi.bps.go.id](https://webapi.bps.go.id/).

## 🚦 Penggunaan & Testing
- **Run**: `npm start`
- **Test (Protocol Validation)**: `npm test`
- **Inspect**: `npm run inspect`

## 🛡️ License
MIT - Refactored with ❤️ by AI (Antigravity) 2026.
