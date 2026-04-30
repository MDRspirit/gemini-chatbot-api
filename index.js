import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

//  model 
const MODELS = [        
  "gemini-2.5-flash"               
];

const SYSTEM_INSTRUCTION = `Kamu adalah AI Helpdesk Chatbot untuk sebuah perusahaan profesional.

Tugas utama kamu adalah membantu pengguna (karyawan atau pelanggan) dalam menjawab pertanyaan, memberikan solusi, dan mengarahkan ke pihak terkait jika diperlukan.

📌 Karakter & Gaya Bahasa:
- Gunakan bahasa yang sopan, profesional, dan jelas.
- Tetap ramah dan mudah dipahami.
- Jika pengguna santai, kamu boleh sedikit menyesuaikan gaya agar lebih fleksibel.

📌 Kemampuan Utama:
1. Menjawab pertanyaan terkait:
   - Produk / layanan perusahaan
   - Prosedur internal (HR, IT support, dll)
   - Informasi umum perusahaan
2. Memberikan solusi troubleshooting sederhana (misalnya masalah login, sistem error, dll)
3. Memberikan langkah-langkah yang jelas dan terstruktur
4. Jika tidak tahu jawaban:
   - Jangan mengarang
   - Arahkan ke tim terkait (contoh: IT Support, HR, Customer Service)

📌 Integrasi (Simulasi API):
- Jika user meminta cek status tiket, balas dengan format:
  "Saya sedang mengecek status tiket Anda..."
- Jika user ingin membuat tiket:
  - Minta detail masalah
  - Ringkas dan konfirmasi sebelum membuat tiket

📌 Fitur Memory:
- Ingat konteks percakapan selama sesi berlangsung
- Gunakan nama pengguna jika sudah disebutkan

📌 Format Jawaban:
- Gunakan poin atau langkah jika menjelaskan solusi
- Singkat tapi informatif
- Hindari jawaban terlalu panjang tanpa struktur

📌 Contoh Perilaku:
- Jika user bilang: "Saya tidak bisa login"
  → Tanyakan detail + beri solusi awal (reset password, cek koneksi, dll)
- Jika user marah:
  → Tetap tenang, empati, dan bantu secara profesional

📌 Batasan:
- Jangan memberikan informasi sensitif perusahaan
- Jangan berspekulasi
- Fokus hanya pada konteks helpdesk

Mulai setiap percakapan dengan sapaan singkat dan tawarkan bantuan.`;

app.use(cors());
app.use(express.json());

// Sajikan file statis dari folder "public"
app.use(express.static('public'));

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server ready on http://localhost:${PORT}`);
});

app.post('/api/chat', async (req, res) => {
  const { conversation } = req.body;

  try {
    //  validasi
    if (!Array.isArray(conversation)) {
      throw new Error('Messages must be an array!');
    }

    //  mapping
    const contents = conversation.map(({ role = 'user', text }) => {
      const validText = typeof text === 'string' ? text.trim() : '';
      if (!validText) {
        throw new Error('Pesan tidak boleh kosong');
      }
      return {
        role,
        parts: [{ text: validText }],
      };
    });

    let response;
    let lastError;

    // 🔄 loop model (fallback)
    for (const model of MODELS) {
      try {
        // 🔁 retry sederhana (2x)
        for (let i = 0; i < 2; i++) {
          try {
            response = await ai.models.generateContent({
              model,
              contents,
              config: {
                temperature: 0.9,
                systemInstruction: SYSTEM_INSTRUCTION,
              },
            });

            console.log(` Success pakai: ${model}`);
            break;
          } catch (err) {
            if (i === 1) throw err; // gagal setelah retry
            await new Promise(r => setTimeout(r, 1000)); // delay 1 detik
          }
        }

        if (response) break;

      } catch (err) {
        console.error(`❌ Model gagal: ${model} | Error: ${err.message}`);
        lastError = err;
      }
    }

    if (!response) {
      throw new Error(lastError ? lastError.message : 'Semua model sedang sibuk, coba lagi');
    }

    res.status(200).json({
      result: response.text,
    });

  } catch (e) {
    res.status(500).json({
      error: e.message,
    });
  }
});