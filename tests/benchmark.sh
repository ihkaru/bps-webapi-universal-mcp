#!/bin/bash

# ==============================================================================
# BPS MCP Server - Independent Black-Box Benchmark Suite
# ==============================================================================
# This script executes standard JSON-RPC 2.0 requests over stdio to verify the
# diversity, execution speed, and exactness of data retrieved from the BPS MCP
# server. It runs fully independently and measures timing for each scenario.
# ==============================================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================================================${NC}"
echo -e "${CYAN}📊 Starting BPS MCP Server Black-Box Benchmark Suite (May 2026 Ready)${NC}"
echo -e "${CYAN}======================================================================${NC}"

# Check BPS_API_KEY
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$BPS_API_KEY" ]; then
  echo -e "${RED}❌ Error: BPS_API_KEY environment variable is not set!${NC}"
  echo -e "Please configure it in a .env file or export it manually."
  exit 1
fi

# Temp file for JSON-RPC payloads and responses
PAYLOAD_TEMP=$(mktemp)
RESPONSE_TEMP=$(mktemp)

# Clean up on exit
cleanup() {
  rm -f "$PAYLOAD_TEMP" "$RESPONSE_TEMP"
}
trap cleanup EXIT

# Benchmark Function
run_benchmark() {
  local id="$1"
  local topic="$2"
  local region="$3"
  local year="$4"
  local expected_keyword="$5"
  
  echo -e "\n--------------------------------------------------"
  echo -e "${YELLOW}🏃 Running Scenario $id: Topic='$topic', Region='$region', Year='$year'${NC}"
  
  # Create JSON-RPC 2.0 Payload
  cat <<EOF > "$PAYLOAD_TEMP"
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"bps_query","arguments":{"topic":"$topic","region":"$region","year":"$year"}},"id":$id}
EOF

  # Start timer
  local start_time=$(date +%s%N)
  
  # Run the server with Stdio transport, piping payload and capturing response
  node index.js < "$PAYLOAD_TEMP" > "$RESPONSE_TEMP" 2>/dev/null
  
  # End timer
  local end_time=$(date +%s%N)
  
  # Calculate duration in ms
  local duration=$(( (end_time - start_time) / 1000000 ))
  local duration_sec=$(node -e "console.log(($duration / 1000).toFixed(3))")
  
  # Read stdout response
  local raw_response=$(cat "$RESPONSE_TEMP")
  
  if [ -z "$raw_response" ]; then
    echo -e "${RED}❌ FAILED (No output from MCP server)${NC}"
    return 1
  fi
  
  # Extract text content using simple node inline script since jq might not be present
  local extracted_text=$(node -e "
    try {
      const res = JSON.parse(process.argv[1]);
      const text = res.result.content[0].text;
      console.log(text);
    } catch(e) {
      console.log('__ERROR__');
    }
  " "$raw_response")
  
  if [ "$extracted_text" = "__ERROR__" ]; then
    echo -e "${RED}❌ FAILED (Invalid JSON-RPC response format)${NC}"
    echo -e "Raw response: $raw_response"
    return 1
  fi
  
  # Print execution time
  echo -e "⏱️ Time Taken: ${GREEN}${duration_sec}s${NC} (${duration} ms)"
  
  # Perform assertions
  local pass=true
  
  # Check if expected keyword/concept is present in the text
  if [[ ! "${extracted_text,,}" =~ ${expected_keyword,,} ]]; then
    echo -e "${RED}❌ Concept Mismatch!${NC} Expected keyword/topic '${expected_keyword}' in result."
    pass=false
  else
    echo -e "${GREEN}✓ Concept Matched!${NC} Found keyword/topic '${expected_keyword}'."
  fi
  
  # Print sample data
  echo -e "📄 Extracted Sample Output:\n"
  echo -e "$extracted_text" | head -n 12
  echo -e "..."
  
  if [ "$pass" = true ] && [ $duration -lt 120000 ]; then
    echo -e "${GREEN}⭐ SCENARIO $id PASSED SUCCESSFULLY!${NC}"
    return 0
  else
    echo -e "${RED}❌ SCENARIO $id FAILED ASSERTIONS!${NC}"
    return 1
  fi
}

# Define Scenarios
# Schema: ID, Topic, Region, Year, Expected_Keyword_In_Output
failures=0

run_benchmark 1 "IPM" "Mempawah" "2023" "Indeks Pembangunan Manusia" || ((failures++))
run_benchmark 2 "Kemiskinan" "Banyuwangi" "2024" "Kemiskinan" || ((failures++))
run_benchmark 3 "PDRB" "Jawa Barat" "2023" "PDRB" || ((failures++))
run_benchmark 4 "Gini Ratio" "Kalimantan Barat" "2024" "Gini" || ((failures++))
run_benchmark 5 "Inflasi" "Nasional" "2023" "Inflasi" || ((failures++))
run_benchmark 6 "PDRB" "Nasional" "2023" "PDRB" || ((failures++))
run_benchmark 7 "TPT" "Jawa Timur" "2024" "TPT" || ((failures++))
run_benchmark 8 "IPM, Kemiskinan" "Mempawah, Banyuwangi" "2022, 2023" "Mempawah" || ((failures++))

echo -e "\n=================================================="
if [ $failures -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL BENCHMARKS COMPLETED SUCCESSFULLY UNDER 2 MINUTES!${NC}"
  exit 0
else
  echo -e "${RED}⚠️ Benchmarking completed with $failures failures/mismatches.${NC}"
  exit 1
fi
