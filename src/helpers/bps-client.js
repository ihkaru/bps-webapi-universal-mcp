/**
 * BPS API Client — HTTP helpers for all BPS endpoints.
 * Pure functions with no side effects (easy to unit test).
 */

import { BASE_URL, API_KEY } from "../config.js";

/** Centralized response handler for JSON safety */
async function handleResponse(res) {
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await res.text();
    return {
      status: "ERROR",
      message: "BPS API returned non-JSON response (likely HTML error/maintenance page).",
      details: text.slice(0, 200).trim(),
    };
  }

  try {
    return await res.json();
  } catch (e) {
    return {
      status: "ERROR",
      message: "Failed to parse BPS API response as JSON.",
      error: e.message,
    };
  }
}

/** Standard BPS API fetch */
export async function bpsFetch(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("key", API_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString());
  return handleResponse(res);
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
  const res = await fetch(url.toString());
  return handleResponse(res);
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
  const res = await fetch(url.toString());
  return handleResponse(res);
}
