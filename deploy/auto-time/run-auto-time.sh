#!/usr/bin/env bash
set -euo pipefail

cd /workspace

mkdir -p /logs
export npm_config_cache="${npm_config_cache:-/tmp/npm-cache}"

timestamp="$(date '+%Y-%m-%d_%H-%M-%S')"
log_file="/logs/auto-time-${timestamp}.log"

echo "[auto-time] starting run at $(date --iso-8601=seconds)" | tee -a "${log_file}"
npm ci | tee -a "${log_file}"
echo "[auto-time] running full auto-time loop at $(date --iso-8601=seconds)" | tee -a "${log_file}"
npx --yes tsx scripts/asset-log-time-capture/fullLoopRunner.ts --org-id="${SA_TIME_ORG_ID}" "$@" | tee -a "${log_file}"
echo "[auto-time] finished run at $(date --iso-8601=seconds)" | tee -a "${log_file}"
