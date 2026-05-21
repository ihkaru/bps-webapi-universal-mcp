import { BASE_URL, API_KEY } from "../src/config.js";

const COOKIE_STRING = `_ga=GA1.1.980222238.1778667384; TS0151fc2b=0167a1c861aac68ffefd1f1149ad0e8ef57ca79fc416f44d2a16ea3805129e07edf9b27221efd1532e1cc59f8187d2ce591ea4ca15; TS01bafd94=01266d26d0bf86e2b61a730c4cd336777681f76e5855ae56690fc7fd95624a1741a675f7450bd4f61c8b357cf9ab97c2113bb6267c; _ga_K98R6MSKRH=GS2.1.s1779334905$o6$g1$t1779335059$j60$l0$h0; TS018af012=0167a1c86166518762336a09cbf4229533e06319aa1a36b9afb8b00222880bedc11cc70c7e79263c9ee619c155e9bcb13d4ff659f623a9d5e647ae582618b4f451e287bf725955cbebfcb8ee7c3c0a64b8c62cdc81; BIGipServeriapp_cluster_integrator.app~iapp_cluster_integrator_pool=2854486026.20480.0000; TS01f66aea=0167a1c8611f8e31d6855164b7623ecd8e68ed8b10311aa6248f9fc285eabe83acb4eedd61c3c482e420a6d24bd2f4f14a3de6517b; cf_clearance=kakaWVjZYsFAsbK_zFPCaqUeDL9ut5ltd7YmNLett.Y-1779344016-1.2.1.1-YPsKyoL0eKe2j5ZXN6zR5i8fLRbr0d0JeZOE37qwdJ99HIUx2t_yNWsaYCpk_WuwO6prfL5FxNoitSlJvVmg07Qk2OgQhIjLlJlUqb8HddsxoB1tAsvV8j5K7WhSpHqFDC75w23QRA4MMBu3rOu1WcwegiMyq2iEpTRdk1zeNJ21kIgovai8AcycYoB3A.G0UCHfQyfuI9TsueVtm9yvcpsdR5u8K4Oyk8_jEu0KbVVwjA9DgioKZt067OA8oQvTdmmc7J2SJE4D6dWYXu.qx57UlhSIZYXrA2nTYO1r.OLWVe9l351ozCyBt43Pkk89cPjQPjrsIYaLwRR5ENfHNQ; __cf_bm=mlWWqwDrF_xQhuX_WZFJLqyoFkx_bzD6.HuP1RP25bk-1779344029.8812463-1.0.1.1-xcgGZIFv7VaaNcYHvDRs8FRQ0aqFX6QMCxi5RQm3KW5bz05cPg65usJTQtwjWHo7dwQtaqKqTghXqh2WEyGtkaCT0iSEei.xmM8oI6ehkf1NCaRNWrLs8agElroJPd.k; PHPSESSID=mqqdpjjjlb6jh4mt8n9clkv080; TS7e23ad4f029=0815dd1fcdab2800b961dfc835f29e531577452ae0d2fd59c06812d5f9539558d1af104b7595ca9ef55be1be34bd50ac`;

async function fetchBps(urlPath) {
  const url = `${BASE_URL}${urlPath}`;
  console.log(`📡 Fetching: ${url}`);
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36",
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      "Cookie": COOKIE_STRING,
      "DNT": "1",
      "Pragma": "no-cache",
      "Referer": "https://webapi.bps.go.id/documentation/",
      "sec-ch-ua": '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "X-Requested-With": "XMLHttpRequest",
      "X-Security-Request": "required"
    }
  });
  
  if (!res.ok) {
    throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
  }
  
  return await res.json();
}

async function run() {
  try {
    // 1. Let's list subjects in domain Banyuwangi (3510) to find PDRB variables
    const banyuwangiDomain = "3510";
    console.log("🟢 [1] Fetching subjects for Banyuwangi (3510)...");
    const subRes = await fetchBps(`/list/model/subject/domain/${banyuwangiDomain}/key/${API_KEY}/`);
    console.log("Subjects response status:", subRes.status);
    
    // 2. Let's find Gini Ratio or PDRB variables in Banyuwangi (3510)
    console.log("\n🟢 [2] Fetching PDRB variables for Banyuwangi (3510)...");
    const varRes = await fetchBps(`/list/model/var/domain/${banyuwangiDomain}/keyword/PDRB/key/${API_KEY}/`);
    console.log("Variables response status:", varRes.status);
    if (varRes.status === "OK") {
      const vars = varRes.data[1];
      vars.forEach(v => console.log(`  - [ID: ${v.var_id}] ${v.title} (${v.unit})`));
      
      const selectedVarId = vars[0].var_id;
      console.log(`\n🟢 [3] Selected variable ID: ${selectedVarId}. Fetching period (tahun)...`);
      const thRes = await fetchBps(`/list/model/th/domain/${banyuwangiDomain}/var/${selectedVarId}/key/${API_KEY}/`);
      console.log("Periods response status:", thRes.status);
      
      if (thRes.status === "OK") {
        const ths = thRes.data[1];
        ths.forEach(t => console.log(`  - [ID: ${t.th_id}] Year: ${t.th}`));
        
        // Find 2023, 2024, 2025 ids
        const targetYears = ["2023", "2024", "2025"];
        const selectedThIds = ths.filter(t => targetYears.includes(t.th)).map(t => t.th_id).join(";");
        
        console.log(`\n🟢 [4] Fetching data for Banyuwangi, var: ${selectedVarId}, periods: ${selectedThIds}...`);
        const dataRes = await fetchBps(`/list/model/data/domain/${banyuwangiDomain}/var/${selectedVarId}/th/${selectedThIds}/key/${API_KEY}/`);
        console.log("Data response status:", dataRes.status);
        console.log("\n📊 DATA SUMMARY:");
        console.log(JSON.stringify(dataRes.datacontent, null, 2));
      }
    }
  } catch (err) {
    console.error("❌ Execution Error:", err);
  }
}

run();
