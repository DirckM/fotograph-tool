# Jurre marketing video — LTX 2.3 face-swap test

Source workflow: https://comfy.org/workflows/bed989744195-bed989744195/

Inputs:

- `Jurre Marketing video.mp4` — 9.87 seconds, 464×832, 29.97 fps, AAC audio
  <br>Not in git. A client's marketing video, an input to this experiment rather
  than anything this repo produces. It lives locally at
  `experiments/jurre-ltx-face-swap/input/`, which is gitignored. Put it back there
  to rerun the workflow.
- Face reference — fotograph identity cell `poses_hires/cell_01.jpg`

Execution policy:

1. Do not interrupt the active fotograph overnight experiment queue.
2. Stage models and inputs while that queue runs.
3. Install missing nodes and restart ComfyUI only after the queue exits.
4. Render a short validation segment.
5. If validation succeeds, render the complete clip and preserve its original audio.

Outputs are downloaded to `output/`.
