# Jurre marketing video — LTX 2.3 face-swap test

Source workflow: https://comfy.org/workflows/bed989744195-bed989744195/

Inputs:

- `Jurre Marketing video.mp4` — 9.87 seconds, 464×832, 29.97 fps, AAC audio
- Face reference — fotograph identity cell `poses_hires/cell_01.jpg`

Execution policy:

1. Do not interrupt the active fotograph overnight experiment queue.
2. Stage models and inputs while that queue runs.
3. Install missing nodes and restart ComfyUI only after the queue exits.
4. Render a short validation segment.
5. If validation succeeds, render the complete clip and preserve its original audio.

Outputs are downloaded to `output/`.
