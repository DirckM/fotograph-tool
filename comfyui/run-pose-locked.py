#!/usr/bin/env python3
"""Driver for the pose-body-locked workflow.
Runs the workflow once per pose cell, substituting the pose reference and
filename prefix, then polls ComfyUI until each job finishes.

Usage:  python3 run-pose-locked.py 1          # just cell 1
        python3 run-pose-locked.py 2 15       # cells 2..15
"""
import json, sys, time, urllib.request, urllib.error

API = "http://127.0.0.1:3000"
WORKFLOW = "/workspace/ComfyUI/pose-body-locked-api.json"
POSE_DIR = "poses_hires"          # relative to ComfyUI/input
BASE_SEED = 770011

def post(path, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(API + path, data=data,
                                 headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=30))

def get(path):
    return json.load(urllib.request.urlopen(API + path, timeout=30))

def run_cell(n, wf_template):
    wf = json.loads(wf_template)
    cell = f"cell_{n:02d}.jpg"
    wf["14"]["inputs"]["image"] = f"{POSE_DIR}/{cell}"
    wf["9"]["inputs"]["filename_prefix"] = f"model1_pose_locked_{n:02d}"
    wf["3"]["inputs"]["seed"] = BASE_SEED + n
    r = post("/prompt", {"prompt": wf})
    pid = r["prompt_id"]
    print(f"cell {n:02d}: queued {pid}", flush=True)
    # poll history
    t0 = time.time()
    while True:
        time.sleep(4)
        hist = get(f"/history/{pid}")
        if pid in hist:
            status = hist[pid].get("status", {})
            if status.get("completed"):
                imgs = []
                for node in hist[pid].get("outputs", {}).values():
                    for img in node.get("images", []):
                        imgs.append(img["filename"])
                print(f"cell {n:02d}: DONE in {time.time()-t0:.0f}s -> {imgs}", flush=True)
                return True
            if status.get("status_str") == "error":
                print(f"cell {n:02d}: ERROR -> {json.dumps(status)}", flush=True)
                return False
        if time.time() - t0 > 600:
            print(f"cell {n:02d}: TIMEOUT after 600s", flush=True)
            return False

def main():
    start = int(sys.argv[1])
    end = int(sys.argv[2]) if len(sys.argv) > 2 else start
    wf_template = open(WORKFLOW).read()
    ok = 0
    for n in range(start, end + 1):
        if run_cell(n, wf_template):
            ok += 1
    print(f"\n=== {ok}/{end-start+1} cells completed ===", flush=True)

if __name__ == "__main__":
    main()
