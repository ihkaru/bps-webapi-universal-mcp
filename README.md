# BPS Agentic MCP Server (v2.3) 🚀

Akses data statistik resmi **BPS Indonesia** secara cerdas menggunakan **Model Context Protocol (MCP)**. Server ini dirancang khusus untuk **Asisten AI** (Claude, Cursor, GPT) agar dapat mengambil data indikator strategis, PDRB, hingga komoditas pertanian dengan akurasi tinggi dan efisiensi token maksimal.

## 🧠 Filosofi: Agent-First & Outcome-Oriented
Berbeda dengan wrapper API tradisional, server ini menggunakan pendekatan **Agent-First**:
- **Minim Token**: Response dikurasi dalam format Markdown yang padat, menyisakan lebih banyak context-window untuk penalaran AI.
- **Orkestrasi Otomatis**: Tool `bps_query` melakukan pencarian multi-step (domain -> subjek -> periode -> data) dalam satu kali panggil.
- **Actionable Errors**: Kesalahan tidak hanya dilaporkan, tapi disertai saran tindakan perbaikan untuk AI.

## 🚦 Fitur Utama (v2.3 - 2026 Ready)
- **`bps_query` Orchestration**: Satu tool untuk semua. Otomatis mencari domain, subjek, variabel, dan periode.
- **Domain Fallback**: Jika data kabupaten tidak ditemukan, server otomatis mencoba mencari di domain provinsi induk.
- **Fuzzy Region Matching**: Mengenali input natural seperti "Mempawah" sebagai "Kab. Mempawah" tanpa perlu ID manual.
- **Full Coverage**: Mendukung Dynamic Data, Strategic Indicators, Press Releases, Foreign Trade, dan SIMDASI.
- **100% Protocol Compliant**: Mendukung standar MCP terbaru (v2024-11-05) dengan logging yang aman (Stderr-only).

## 🛠️ Instalasi & Konfigurasi

### 1. Setup API Key
Dapatkan API Key di [webapi.bps.go.id](https://webapi.bps.go.id/). Simpan di file `.env`:
```env
BPS_API_KEY=your_api_key_here
```

### 2. Tambahkan ke Editor (Claude/Cursor)
Tambahkan konfigurasi berikut ke MCP settings Anda:

**Claude Desktop (`claude_desktop_config.json`):**
```json
{
  "mcpServers": {
    "bps-agentic": {
      "command": "node",
      "args": ["/path/to/bps-webapi-universal-mcp/index.js"],
      "env": {
        "BPS_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## 📖 Referensi Tool

### 1. Orchestration (Rekomendasi Utama)
- `bps_query`: Ambil data apapun hanya dengan menyebutkan topik, wilayah, dan tahun.

### 2. Dynamic Data & Reference
- `bps_list_variable`: Cari ID variabel (var_id).
- `bps_get_dynamic_data`: Ambil data mentah tabel dinamis.
- `bps_domain_list`: Daftar ID wilayah (Nasional, Provinsi, Kab/Kota).
- `bps_strategic_indicators`: Indikator makro (IPM, Inflasi, Kemiskinan).

### 3. Specialized Tools
- `bps_simdasi_*`: Akses data "Statistik Dalam Angka" (Interoperabilitas).
- `bps_foreign_trade`: Data ekspor/impor berdasarkan kode HS.
- `bps_list_press_release`: Berita resmi statistik terbaru.

## 💡 Contoh Prompt untuk AI
> "Coba cek angka kemiskinan di Kabupaten Mempawah tahun 2023 dan bandingkan dengan rata-rata Provinsi Kalimantan Barat."

Server akan otomatis:
1. Mencari `domain_id` Mempawah.
2. Mencari `var_id` kemiskinan.
3. Mengambil data dan menyajikannya dalam Markdown yang rapi.

## 🧪 Development
- **Run**: `npm start`
- **Inspect (MCP Inspector)**: `npm run inspect`
- **Validate Protocol**: `npm test`

---
MIT License • Refactored with ❤️ by **Antigravity AI** 2026.
