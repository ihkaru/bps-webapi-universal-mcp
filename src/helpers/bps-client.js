/**
 * BPS API Client — HTTP helpers for all BPS endpoints.
 * Pure functions with no side effects (easy to unit test).
 * Updated to use got-scraping for TLS Impersonation to bypass WAF & Cloudflare blocks.
 */

import { gotScraping } from "got-scraping";
import { BASE_URL, API_KEY } from "../config.js";

/** Centralized fetch helper using got-scraping */
async function performRequest(urlStr) {
  try {
    const response = await gotScraping({
      url: urlStr,
      method: "GET",
      responseType: "json"
    });
    
    return response.body;
  } catch (error) {
    if (error.response) {
      // Handle HTML error or maintenance pages
      const contentType = error.response.headers["content-type"];
      if (!contentType || !contentType.includes("application/json")) {
        return {
          status: "ERROR",
          message: `BPS API returned non-JSON response (HTTP ${error.response.statusCode}).`,
          details: String(error.response.body).slice(0, 200).trim(),
        };
      }
      return error.response.body;
    }
    
    return {
      status: "ERROR",
      message: "Network request failed.",
      error: error.message,
    };
  }
}

const apiCache = new Map();
const inflightRequests = new Map();

/** Standard BPS API fetch */
export async function bpsFetch(endpoint, params = {}) {
  let urlStr;
  
  if (endpoint === "/list") {
    // 2026 Stability: Strict Path Parameters for V1
    const { model, domain, lang, ...rest } = params;
    urlStr = `${BASE_URL}/list/model/${model || "var"}/lang/${lang || "ind"}/domain/${domain || "0000"}/key/${API_KEY}/`;
    
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined && v !== null && v !== "") {
        // v11.1: BPS V1 path parameters require literal semicolons for multi-value filtering
        const encoded = encodeURIComponent(String(v)).replace(/%3B/g, ";");
        urlStr += `${k}/${encoded}/`;
      }
    }
  } else if (endpoint === "/domain") {
    // Domain list - Path param style is more stable for V1
    const { type, ...rest } = params;
    urlStr = `${BASE_URL}/domain/key/${API_KEY}/type/${type || "all"}/`;
    for (const [k, v] of Object.entries(rest)) {
      urlStr += `${k}/${encodeURIComponent(String(v))}/`;
    }
  } else {
    // Fallback for other endpoints
    const url = new URL(`${BASE_URL}${endpoint}`);
    url.searchParams.set("key", API_KEY);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    }
    urlStr = url.toString();
  }

  const cacheKey = urlStr;
  
  // 1. Check in-memory cache
  if (apiCache.has(cacheKey)) {
    return apiCache.get(cacheKey);
  }

  // 2. Check inflight requests (deduplication)
  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey);
  }

  // 3. Perform actual fetch
  const fetchPromise = (async () => {
    try {
      const data = await performRequest(cacheKey);

      if (data?.status?.toUpperCase() === "OK") {
        apiCache.set(cacheKey, data);
      }
      return data;
    } finally {
      inflightRequests.delete(cacheKey);
    }
  })();

  inflightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}


/** EXIM (ekspor/impor) endpoint */
export async function bpsEximFetch(params = {}) {
  const url = new URL(`${BASE_URL}/dataexim/`);
  url.searchParams.set("key", API_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }
  return performRequest(url.toString());
}

/** SIMDASI / Interoperabilitas endpoint */
export async function bpsInteropFetch(datasource, id, params = {}) {
  const url = new URL(
    `${BASE_URL}/interoperabilitas/datasource/${datasource}/id/${id}/`
  );
  url.searchParams.set("key", API_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }
  return performRequest(url.toString());
}

