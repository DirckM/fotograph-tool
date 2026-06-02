#!/bin/bash
# Pod-side orchestrator: waits for the in-progress women LoRA training, then
# runs the men LoRA, then copies both LoRAs into ComfyUI. Fully detached so it
# runs regardless of whether the operator's laptop is awake.
STATUS=/workspace/train-all.status

echo "[$(date)] waiting for women LoRA training to finish" > "$STATUS"
while ps -ef | grep -q "[s]dxl_train_network"; do sleep 30; done
echo "[$(date)] women LoRA done" >> "$STATUS"

echo "[$(date)] starting men LoRA training" >> "$STATUS"
cd /workspace/kohya
bash train-lora.sh men >/workspace/train-men.log 2>&1
echo "[$(date)] men LoRA done" >> "$STATUS"

mkdir -p /workspace/ComfyUI/models/loras
cp /workspace/loras/wkedit*.safetensors /workspace/ComfyUI/models/loras/ 2>/dev/null
echo "[$(date)] ALL DONE — LoRAs copied to ComfyUI/models/loras:" >> "$STATUS"
ls -la /workspace/loras/ >> "$STATUS" 2>&1
