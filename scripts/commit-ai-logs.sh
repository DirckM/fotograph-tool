#!/bin/bash
# Auto-commit AI logs so we can track request history in git
# Run manually or via cron: */5 * * * * cd /path/to/project && ./scripts/commit-ai-logs.sh

cd "$(dirname "$0")/.."

if [ ! -d "logs/ai" ] || [ -z "$(ls -A logs/ai 2>/dev/null)" ]; then
  exit 0
fi

git add logs/ai/
if git diff --cached --quiet; then
  exit 0
fi

count=$(git diff --cached --name-only | wc -l | tr -d ' ')
git commit -m "log: ${count} AI request(s) logged"
