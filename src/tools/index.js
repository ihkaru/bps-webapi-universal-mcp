/**
 * Tools Barrel — registers all tools with the MCP server.
 */

import { register as registerBpsQuery } from "./bps-query.js";
import { register as registerDynamicData } from "./dynamic-data.js";
import { register as registerPressRelease } from "./press-release.js";
import { register as registerTrade } from "./trade.js";
import { register as registerReference } from "./reference.js";
import { register as registerSimdasi } from "./simdasi.js";

export function registerAllTools(server) {
  registerBpsQuery(server);       // PRIMARY: bps_query
  registerDynamicData(server);    // list_variable, get_dynamic_data, list_period, list_vertical_var
  registerPressRelease(server);   // list_press_release, get_press_release
  registerTrade(server);          // foreign_trade
  registerReference(server);      // domain_list, subjects, indicators, publication, infographic, glosarium, news
  registerSimdasi(server);        // simdasi_subjects, simdasi_tables, simdasi_get_table, simdasi_regions
}
