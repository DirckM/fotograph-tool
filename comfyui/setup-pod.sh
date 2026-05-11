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
SSH_PUBKEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHrARsjmtAhsmwzi4fpJgTjuUn53l2lcJhV4laSVBunn dirckmulder20@gmail.com"

log() { echo "[$(date '+%H:%M:%S')] $1"; }

if [ ! -f "$COMFY_DIR/main.py" ]; then
  log "ERROR: ComfyUI not found at $COMFY_DIR. The network volume must be attached."
  exit 1
fi

# === SSH access ===
# Container disk is wiped on every pod restart, so sshd + authorized_keys must
# be re-installed each boot. The pod has TCP port 22 exposed in its template.
log "Setting up sshd..."
mkdir -p ~/.ssh
grep -qF "${SSH_PUBKEY%% *}" ~/.ssh/authorized_keys 2>/dev/null \
  || echo "$SSH_PUBKEY" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys
if ! command -v sshd >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y -qq openssh-server
fi
mkdir -p /var/run/sshd
sed -i 's/#PermitRootLogin .*/PermitRootLogin yes/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
pgrep -x sshd >/dev/null || /usr/sbin/sshd
log "sshd ready"

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

# transformers >= 4.50 registers custom ops with infer_schema signatures that
# only torch >= 2.5 supports. ComfyUI requirements pull in the latest
# transformers, which then crashes when comfyui_controlnet_aux imports the Zoe
# depth model. Pin to a torch-2.4-compatible version.
log "Pinning transformers<4.50 for torch 2.4.1 compatibility..."
pip3 install -q --no-cache-dir 'transformers<4.50' 2>&1 | tail -1

# ComfyUI requirements.txt silently downgrades torch to the PyPI default wheel
# (cu121), which mismatches the cu124 torchaudio shipped in the pytorch image.
# ComfyUI then fatals at startup with "PyTorch and TorchAudio were compiled
# with different CUDA versions". The 20GB container disk is too small to hold
# both the cu121 and cu124 wheels simultaneously, so --force-reinstall fails
# with "No space left on device". Pattern: uninstall the cu121 stack + the
# nvidia/triton wheels it pulled in, purge the pip cache, then install the
# matched cu124 stack fresh.
log "Aligning torch+vision+audio to cu124 (uninstall cu121 + purge cache first)..."
pip3 uninstall -y -q torch torchvision torchaudio 2>&1 | tail -1 || true
NVIDIA_PKGS=$(pip3 list 2>/dev/null | awk '/^nvidia-|^triton/ {print $1}' | xargs)
if [ -n "$NVIDIA_PKGS" ]; then
  log "  uninstalling nvidia/triton wheels: $NVIDIA_PKGS"
  pip3 uninstall -y -q $NVIDIA_PKGS 2>&1 | tail -1 || true
fi
pip3 cache purge >/dev/null 2>&1 || true
pip3 install -q --no-cache-dir \
  torch==2.4.1 torchvision==0.19.1 torchaudio==2.4.1 \
  --index-url https://download.pytorch.org/whl/cu124 2>&1 | tail -2
python -c 'import torch, torchaudio; print(f"  torch={torch.__version__}, audio={torchaudio.__version__}")'

log "Stopping any running ComfyUI on port $PORT..."
pkill -f "python.*main.py.*--port.*$PORT" 2>/dev/null || true
sleep 2

log "Starting ComfyUI from $COMFY_DIR on port $PORT..."
cd "$COMFY_DIR"
python main.py --listen --port "$PORT"
