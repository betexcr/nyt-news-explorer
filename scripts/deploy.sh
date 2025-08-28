#!/usr/bin/env bash
set -euo pipefail

# Required env vars: FTP_HOST, FTP_USER, FTP_PASS
: "${FTP_HOST:?FTP_HOST is required}"
: "${FTP_USER:?FTP_USER is required}"
: "${FTP_PASS:?FTP_PASS is required}"

LOCAL_DIR="${LOCAL_DIR:-/Users/albertomunoz/Documents/Code/nyt-news-explorer/build}"
REMOTE_DIR="${FTP_REMOTE_DIR:-/domains/brainvaultdev.com/public_html/nyt}"

echo "Building production bundle…"
bun run build >/dev/null

echo "Deploying contents of ${LOCAL_DIR}/ to ${REMOTE_DIR} on ${FTP_HOST} (force overwrite + delete)…"

lftp -u "${FTP_USER}","${FTP_PASS}" "${FTP_HOST}" -e "\
set ssl:verify-certificate no; \
set ftp:passive-mode true; \
set xfer:clobber on; \
set net:timeout 20; \
set net:max-retries 2; \
cd \"${REMOTE_DIR}\"; \
mirror -R --delete --ignore-time --overwrite --parallel=8 \"${LOCAL_DIR}/\" .; \
cls -l; \
bye" 

echo "Deploy complete."


