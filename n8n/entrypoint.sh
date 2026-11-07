#!/bin/sh
# Container entrypoint for n8n.
# First start only: import the Mailpit SMTP credential (no secret: Mailpit
# accepts any mail) and the three workflows, then activate the two triggered
# ones. Later starts keep the workflows as they are: importing again would
# deactivate them. To re-import after changing n8n/workflows/, delete the
# marker: docker compose -f n8n/docker-compose.yml exec n8n rm /home/node/.n8n/.lendloop-imported
set -e
MARKER=/home/node/.n8n/.lendloop-imported

if [ ! -f "$MARKER" ]; then
  n8n import:credentials --input=/lendloop/credentials/mailpit.json
  n8n import:workflow --separate --input=/lendloop/workflows
  for id in LendLoopNotify01 LendLoopRemind01; do
    n8n update:workflow --id="$id" --active=true
  done
  touch "$MARKER"
fi

exec n8n start
