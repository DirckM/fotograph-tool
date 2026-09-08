#!/usr/bin/env bash
set -euo pipefail

COMFY=/workspace/ComfyUI
mkdir -p \
  "$COMFY/models/diffusion_models" \
  "$COMFY/models/vae" \
  "$COMFY/models/text_encoders" \
  "$COMFY/models/loras"

wget -c -O "$COMFY/models/diffusion_models/ltx-2.3-22b-distilled_transformer_only_fp8_input_scaled_v3.safetensors" \
  "https://huggingface.co/Kijai/LTX2.3_comfy/resolve/main/diffusion_models/ltx-2.3-22b-distilled_transformer_only_fp8_input_scaled_v3.safetensors"
wget -c -O "$COMFY/models/vae/LTX23_video_vae_bf16.safetensors" \
  "https://huggingface.co/Kijai/LTX2.3_comfy/resolve/main/vae/LTX23_video_vae_bf16.safetensors"
wget -c -O "$COMFY/models/vae/LTX23_audio_vae_bf16.safetensors" \
  "https://huggingface.co/Kijai/LTX2.3_comfy/resolve/main/vae/LTX23_audio_vae_bf16.safetensors"
wget -c -O "$COMFY/models/text_encoders/ltx-2.3_text_projection_bf16.safetensors" \
  "https://huggingface.co/Kijai/LTX2.3_comfy/resolve/main/text_encoders/ltx-2.3_text_projection_bf16.safetensors"
wget -c -O "$COMFY/models/text_encoders/gemma_3_12B_it_fp8_scaled.safetensors" \
  "https://huggingface.co/Comfy-Org/ltx-2/resolve/main/split_files/text_encoders/gemma_3_12B_it_fp8_scaled.safetensors"
wget -c -O "$COMFY/models/loras/ltx23-head_swap_v3_rank_adaptive_fro_098.safetensors" \
  "https://huggingface.co/Alissonerdx/BFS-Best-Face-Swap-Video/resolve/main/ltx-2.3/head_swap_v3_rank_adaptive_fro_098.safetensors"

echo LTX_DOWNLOAD_COMPLETE
