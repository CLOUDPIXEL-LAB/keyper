#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="keyper-docs"

npm run build
npx wrangler pages deploy dist --project-name "$PROJECT_NAME"
