import { BASE_URL, API_KEY } from "../src/config.js";

async function test() {
  const url = `${BASE_URL}/domain/key/${API_KEY}/type/kab/`;
  console.log("Fetching URL:", url);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });
    console.log("Status:", res.status, res.statusText);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log("Body length:", text.length);
    console.log("Body preview:", text.slice(0, 500));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
