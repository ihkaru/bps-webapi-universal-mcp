/**
 * BPS API Client — HTTP helpers for all BPS endpoints.
 * Pure functions with no side effects (easy to unit test).
 */

import { BASE_URL, API_KEY } from "../config.js";

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
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
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
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
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
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}
