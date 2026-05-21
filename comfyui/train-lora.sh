#!/bin/bash
# Train an editorial style LoRA with kohya sd-scripts.
# Usage: train-lora.sh women | men
set -e
SET="$1"
cd /workspace/kohya

case "$SET" in
  women) DATA=/workspace/dataset/train_women; NAME=wkeditf-editorial-v1; EPOCHS=8  ;;
  men)   DATA=/workspace/dataset/train_men;   NAME=wkeditm-editorial-v1; EPOCHS=20 ;;
  *) echo "usage: train-lora.sh women|men"; exit 1 ;;
esac

venv/bin/accelerate launch --num_processes=1 --num_machines=1 \
  --mixed_precision=fp16 --dynamo_backend=no \
  sdxl_train_network.py \
  --pretrained_model_name_or_path=/workspace/ComfyUI/models/checkpoints/sd_xl_base_1.0.safetensors \
  --train_data_dir="$DATA" \
  --output_dir=/workspace/loras \
  --output_name="$NAME" \
  --resolution=1024,1024 \
  --enable_bucket --min_bucket_reso=512 --max_bucket_reso=1536 --bucket_no_upscale \
  --network_module=networks.lora \
  --network_dim=32 --network_alpha=16 \
  --train_batch_size=2 \
  --max_train_epochs="$EPOCHS" \
  --unet_lr=1e-4 --text_encoder_lr=5e-5 --learning_rate=1e-4 \
  --lr_scheduler=cosine --lr_warmup_steps=100 \
  --optimizer_type=AdamW8bit \
  --mixed_precision=fp16 --save_precision=fp16 \
  --cache_latents --cache_latents_to_disk \
  --gradient_checkpointing \
  --sdpa \
  --no_half_vae \
  --min_snr_gamma=5 \
  --caption_extension=.txt \
  --save_model_as=safetensors \
  --save_every_n_epochs=2 \
  --max_data_loader_n_workers=4 \
  --seed=42

echo "=== $NAME training complete ==="
ls -la /workspace/loras/
