import { BASE_URL, API_KEY } from "../src/config.js";

async function test() {
  const url1 = `${BASE_URL}/domain?key=${API_KEY}&type=kab`;
  console.log("Fetching URL 1 (query string):", url1);
  try {
    const res = await fetch(url1, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });
    console.log("URL 1 Status:", res.status, res.statusText);
    const text = await res.text();
    console.log("URL 1 Body length:", text.length);
    console.log("URL 1 Body preview:", text.slice(0, 200));
  } catch (err) {
    console.error("URL 1 Error:", err);
  }
}

test();
