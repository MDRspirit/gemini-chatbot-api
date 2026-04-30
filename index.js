import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

//  model utama + cadangan
const MODELS = [
  "gemini-2.5-flash"
];

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
    const contents = conversation.map(({ role, text }) => ({
      role,
      parts: [{ text }],
    }));

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
                systemInstruction: "Jawab hanya menggunakan bahasa Indonesia",
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