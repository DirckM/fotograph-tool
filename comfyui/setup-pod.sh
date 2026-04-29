#!/bin/bash
# ComfyUI RunPod auto-setup script
# First boot: clones repos + downloads models (~10-15 min)
# Subsequent boots: verifies pip deps, then starts ComfyUI (~30s)
#
# Network volume persists: git repos, models
# Container is ephemeral: pip packages reinstalled each boot if missing
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

# ─── Clone ComfyUI if not on volume yet ───
if [ ! -d "$COMFY_DIR" ]; then
  log "ComfyUI not found on volume, cloning..."
  cd /workspace
  git clone https://github.com/comfyanonymous/ComfyUI.git
  cd "$COMFY_DIR/custom_nodes"
  git clone https://github.com/ltdrdata/ComfyUI-Manager.git
fi

# ─── Ensure ComfyUI core pip deps (every boot) ───
log "Checking ComfyUI core dependencies..."
pip3 install -q -r "$COMFY_DIR/requirements.txt"
pip3 install -q -U --pre comfyui-manager

# ─── First boot: clone custom nodes + download models ───
if [ ! -f "$SETUP_MARKER" ]; then
  log "First boot detected - cloning custom nodes and downloading models..."

  cd "$CUSTOM_NODES"

  declare -A NODES=(
    ["ComfyUI_IPAdapter_plus"]="https://github.com/cubiq/ComfyUI_IPAdapter_plus.git"
    ["comfyui_controlnet_aux"]="https://github.com/Fannovel16/comfyui_controlnet_aux.git"
    ["ComfyUI-Impact-Pack"]="https://github.com/ltdrdata/ComfyUI-Impact-Pack.git"
    ["ComfyUI-Inspire-Pack"]="https://github.com/ltdrdata/ComfyUI-Inspire-Pack.git"
    ["ComfyUI_essentials"]="https://github.com/cubiq/ComfyUI_essentials.git"
    ["rgthree-comfy"]="https://github.com/rgthree/rgthree-comfy.git"
    ["comfyui-art-venture"]="https://github.com/sipherxyz/comfyui-art-venture.git"
    ["comfyui-mixlab-nodes"]="https://github.com/shadowcz007/comfyui-mixlab-nodes.git"
    ["was-node-suite-comfyui"]="https://github.com/WASasquatch/was-node-suite-comfyui.git"
    ["ComfyUI_FaceAnalysis"]="https://github.com/cubiq/ComfyUI_FaceAnalysis.git"
  )

  for node in "${!NODES[@]}"; do
    if [ ! -d "$node" ]; then
      log "Cloning $node..."
      git clone "${NODES[$node]}" 2>/dev/null || true
    fi
  done

  # Impact Pack extra install script
  if [ -f "$CUSTOM_NODES/ComfyUI-Impact-Pack/install.py" ]; then
    cd "$CUSTOM_NODES/ComfyUI-Impact-Pack"
    python3 install.py 2>/dev/null || true
    cd "$CUSTOM_NODES"
  fi

  # Model directories
  mkdir -p "$MODELS"/{checkpoints,controlnet,ipadapter,clip_vision,insightface/models/buffalo_l}

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
    python3 -c "import zipfile; zipfile.ZipFile('/tmp/buffalo_l.zip').extractall('$MODELS/insightface/models/buffalo_l/')"
    rm buffalo_l.zip
  fi

  date > "$SETUP_MARKER"
  log "First boot setup complete!"
else
  log "Network volume ready (repos and models present)"
fi

# ─── Ensure custom node pip deps (every boot) ───
log "Checking custom node pip dependencies..."
for node in comfyui_controlnet_aux ComfyUI-Impact-Pack ComfyUI-Inspire-Pack \
            ComfyUI_essentials comfyui-art-venture was-node-suite-comfyui; do
  if [ -f "$CUSTOM_NODES/$node/requirements.txt" ]; then
    pip3 install -q -r "$CUSTOM_NODES/$node/requirements.txt" 2>/dev/null || true
  fi
done

log "Checking standalone pip packages..."
pip3 install -q insightface onnxruntime-gpu pyOpenSSL watchdog 2>/dev/null || true
log "Dependencies verified."

# ─── Start ComfyUI ───
log "Starting ComfyUI..."
cd "$COMFY_DIR"
python3 main.py --listen 0.0.0.0 --port 8188 --enable-manager --enable-cors-header "*"
