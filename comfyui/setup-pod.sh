#!/bin/bash
# ComfyUI RunPod boot script
#
# Assumes:
#   - Pod template: runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04
#   - Network volume: 100GB, mounted at /workspace
#   - ComfyUI + custom nodes + models already on the volume at /workspace/ComfyUI
#   - Pod has port 3000 exposed
#
# Each pod reset wipes the container disk (pip packages live there), so this
# script reinstalls pip deps from the requirements files on the volume every boot.
# Repos and models on the volume are not touched.
#
# Usage in RunPod template "Docker Command":
#   bash -c "wget -qO /tmp/setup.sh https://raw.githubusercontent.com/DirckM/fotograph-tool/main/comfyui/setup-pod.sh && bash /tmp/setup.sh"

set -e

COMFY_DIR="/workspace/ComfyUI"
CUSTOM_NODES="$COMFY_DIR/custom_nodes"
PORT=3000

log() { echo "[$(date '+%H:%M:%S')] $1"; }

if [ ! -f "$COMFY_DIR/main.py" ]; then
  log "ERROR: ComfyUI not found at $COMFY_DIR. The network volume must be attached."
  exit 1
fi

log "Installing ComfyUI core requirements..."
pip3 install -q -r "$COMFY_DIR/requirements.txt"

log "Installing custom node requirements..."
for req in "$CUSTOM_NODES"/*/requirements.txt; do
  [ -f "$req" ] || continue
  log "  $(dirname "$req" | xargs basename)"
  pip3 install -q -r "$req" 2>/dev/null || true
done

log "Installing standalone pip packages..."
pip3 install -q insightface onnxruntime-gpu pyOpenSSL watchdog 2>/dev/null || true

log "Stopping any running ComfyUI on port $PORT..."
pkill -f "python.*main.py.*--port.*$PORT" 2>/dev/null || true
sleep 2

log "Starting ComfyUI from $COMFY_DIR on port $PORT..."
cd "$COMFY_DIR"
python main.py --listen --port "$PORT"
