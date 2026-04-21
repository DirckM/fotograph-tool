#!/bin/bash
# ComfyUI RunPod auto-setup script
# First boot: installs custom nodes + downloads models (~10-15 min)
# Subsequent boots: starts ComfyUI immediately
#
# Usage in RunPod template "Docker Command":
#   bash -c "wget -qO /tmp/setup.sh https://raw.githubusercontent.com/DirckM/fotograph-tool/main/comfyui/setup-pod.sh && bash /tmp/setup.sh"

set -e

COMFY_DIR="/workspace/ComfyUI"
CUSTOM_NODES="$COMFY_DIR/custom_nodes"
MODELS="$COMFY_DIR/models"
SETUP_MARKER="/workspace/.comfyui-setup-complete"

# ─── Helper ───
log() { echo "[$(date '+%H:%M:%S')] $1"; }

# ─── Install ComfyUI if not on volume yet ───
if [ ! -d "$COMFY_DIR" ]; then
  log "ComfyUI not found on volume, cloning..."
  cd /workspace
  git clone https://github.com/comfyanonymous/ComfyUI.git
  cd ComfyUI
  pip3 install -r requirements.txt

  # Install ComfyUI Manager
  cd custom_nodes
  git clone https://github.com/ltdrdata/ComfyUI-Manager.git
  cd "$COMFY_DIR"
fi

# ─── First boot: install everything ───
if [ ! -f "$SETUP_MARKER" ]; then
  log "First boot detected - installing custom nodes and models..."

  cd "$CUSTOM_NODES"

  # Custom nodes
  log "Installing ComfyUI_IPAdapter_plus..."
  git clone https://github.com/cubiq/ComfyUI_IPAdapter_plus.git 2>/dev/null || true

  log "Installing comfyui_controlnet_aux..."
  if [ ! -d "comfyui_controlnet_aux" ]; then
    git clone https://github.com/Fannovel16/comfyui_controlnet_aux.git
    cd comfyui_controlnet_aux && pip3 install -r requirements.txt && cd "$CUSTOM_NODES"
  fi

  log "Installing ComfyUI-Impact-Pack..."
  if [ ! -d "ComfyUI-Impact-Pack" ]; then
    git clone https://github.com/ltdrdata/ComfyUI-Impact-Pack.git
    cd ComfyUI-Impact-Pack && pip3 install -r requirements.txt && python3 install.py && cd "$CUSTOM_NODES"
  fi

  log "Installing ComfyUI-Inspire-Pack..."
  if [ ! -d "ComfyUI-Inspire-Pack" ]; then
    git clone https://github.com/ltdrdata/ComfyUI-Inspire-Pack.git
    cd ComfyUI-Inspire-Pack && pip3 install -r requirements.txt 2>/dev/null || true && cd "$CUSTOM_NODES"
  fi

  log "Installing ComfyUI_essentials..."
  if [ ! -d "ComfyUI_essentials" ]; then
    git clone https://github.com/cubiq/ComfyUI_essentials.git
    cd ComfyUI_essentials && pip3 install -r requirements.txt 2>/dev/null || true && cd "$CUSTOM_NODES"
  fi

  log "Installing rgthree-comfy..."
  git clone https://github.com/rgthree/rgthree-comfy.git 2>/dev/null || true

  # Pip deps
  log "Installing insightface..."
  pip3 install insightface onnxruntime-gpu

  # Model directories
  mkdir -p "$MODELS/checkpoints"
  mkdir -p "$MODELS/controlnet"
  mkdir -p "$MODELS/ipadapter"
  mkdir -p "$MODELS/clip_vision"
  mkdir -p "$MODELS/insightface/models/buffalo_l"

  # Download models
  log "Downloading RealVisXL V4.0 Lightning checkpoint (~6GB)..."
  [ ! -f "$MODELS/checkpoints/realvisxlV40_v40LightningBakedvae.safetensors" ] && \
    wget -q --show-progress -O "$MODELS/checkpoints/realvisxlV40_v40LightningBakedvae.safetensors" \
      "https://huggingface.co/SG161222/RealVisXL_V4.0_Lightning/resolve/main/RealVisXL_V4.0_Lightning.safetensors"

  log "Downloading OpenPose XL2 ControlNet..."
  [ ! -f "$MODELS/controlnet/OpenPoseXL2.safetensors" ] && \
    wget -q --show-progress -O "$MODELS/controlnet/OpenPoseXL2.safetensors" \
      "https://huggingface.co/thibaud/controlnet-openpose-sdxl-1.0/resolve/main/OpenPoseXL2.safetensors"

  log "Downloading Zoe Depth ControlNet..."
  [ ! -f "$MODELS/controlnet/zoe-depth.safetensors" ] && \
    wget -q --show-progress -O "$MODELS/controlnet/zoe-depth.safetensors" \
      "https://huggingface.co/SargeZT/controlnet-sd-xl-1.0-depth-zoe-noxl/resolve/main/depth-zoe-xl-v1.0-controlnet.safetensors"

  log "Downloading IPAdapter PLUS Face SDXL..."
  [ ! -f "$MODELS/ipadapter/ip-adapter-plus-face_sdxl_vit-h.safetensors" ] && \
    wget -q --show-progress -O "$MODELS/ipadapter/ip-adapter-plus-face_sdxl_vit-h.safetensors" \
      "https://huggingface.co/h94/IP-Adapter/resolve/main/sdxl_models/ip-adapter-plus-face_sdxl_vit-h.safetensors"

  log "Downloading CLIP Vision ViT-H..."
  [ ! -f "$MODELS/clip_vision/CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors" ] && \
    wget -q --show-progress -O "$MODELS/clip_vision/CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors" \
      "https://huggingface.co/h94/IP-Adapter/resolve/main/models/image_encoder/model.safetensors"

  log "Downloading InsightFace buffalo_l..."
  if [ ! -f "$MODELS/insightface/models/buffalo_l/det_10g.onnx" ]; then
    cd /tmp
    wget -q --show-progress -O buffalo_l.zip \
      "https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip"
    unzip -o buffalo_l.zip -d "$MODELS/insightface/models/buffalo_l/"
    rm buffalo_l.zip
  fi

  # Mark setup complete
  date > "$SETUP_MARKER"
  log "Setup complete! Marker written to $SETUP_MARKER"
else
  log "Setup marker found - skipping install (delete $SETUP_MARKER to force reinstall)"
fi

# ─── Start ComfyUI ───
log "Starting ComfyUI..."
cd "$COMFY_DIR"
python3 main.py --listen 0.0.0.0 --port 8188
