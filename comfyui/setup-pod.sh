#!/bin/bash
# ComfyUI RunPod boot script
#
# Assumes the official RunPod template `runpod/stable-diffusion:comfy-ui-6.0.0`
# with the network volume `advanced_azure_pig` (100GB) attached.
#
# ComfyUI + custom nodes + models all live at /workspace/ComfyUI/ComfyUI on the
# network volume - nothing to install, just patch the start path and run.
#
# Usage in RunPod template "Docker Command":
#   bash -c "wget -qO /tmp/setup.sh https://raw.githubusercontent.com/DirckM/fotograph-tool/main/comfyui/setup-pod.sh && bash /tmp/setup.sh"

set -e

COMFY_DIR="/workspace/ComfyUI/ComfyUI"
PRE_START="/pre_start.sh"
PORT=3000

log() { echo "[$(date '+%H:%M:%S')] $1"; }

# Patch the official pre_start so any container-level lifecycle hooks point at
# the correct nested ComfyUI path on the volume.
if [ -f "$PRE_START" ]; then
  log "Patching $PRE_START to use $COMFY_DIR..."
  sed -i "s|cd /ComfyUI|cd $COMFY_DIR|" "$PRE_START"
fi

log "Stopping any ComfyUI started by the runpod image..."
pkill -f "python.*main.py.*--port.*$PORT" 2>/dev/null || true
sleep 2

log "Starting ComfyUI from $COMFY_DIR on port $PORT..."
cd "$COMFY_DIR"
python main.py --listen --port "$PORT"
