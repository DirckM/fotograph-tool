# ComfyUI on RunPod — Setup & Resume Guide

This doc covers everything needed to bring up the ComfyUI pod cleanly, both for first-time deploy and for resuming after a stop / restart / re-deploy.

The boot script `comfyui/setup-pod.sh` (on `main`) does the heavy lifting — installing sshd, pip deps, fixing the torch/CUDA mismatch, and starting ComfyUI. As long as the pod template is configured correctly (below), every restart is fully automatic and we just SSH back in.

---

## One-time pod template configuration

This only needs to happen once. After that, restart is fire-and-forget.

In RunPod, deploy a new pod (or edit the existing template):

| Field | Value |
|---|---|
| **Image** | `runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04` |
| **GPU** | RTX 4090 (24 GB) |
| **Container disk** | **20 GB** |
| **Network volume** | attach `advanced_azure_pig` (100 GB) at `/workspace` |
| **Expose HTTP Ports** | `3000` (ComfyUI web UI — required for `https://<pod-id>-3000.proxy.runpod.net/`) |
| **Expose TCP Ports** | `22` (SSH — required for direct SSH access via `runpod` host alias) |
| **Docker Command** | `bash -c "wget -qO /tmp/setup.sh https://raw.githubusercontent.com/DirckM/fotograph-tool/main/comfyui/setup-pod.sh && bash /tmp/setup.sh"` |

Also (one-time, in your RunPod account settings):

- Add your SSH public key under **Settings → SSH Public Keys** so RunPod auto-injects it as a fallback. The boot script also writes the key to `~/.ssh/authorized_keys`, so this is belt-and-braces but harmless.

### Why each field matters

- **Container disk = 20 GB**: just enough for the cu124 torch stack after we uninstall cu121 + purge the pip cache. Smaller will OOM the disk during torch install.
- **Network volume at `/workspace`**: ComfyUI install, custom nodes, models, inputs, outputs, and saved workflows all live here and survive every restart.
- **HTTP port 3000 exposed**: without this, the RunPod Cloudflare proxy returns 403/404 even though ComfyUI is serving on localhost:3000 inside the pod.
- **TCP port 22 exposed**: enables direct SSH (`scp`, port forwarding, etc.) — far better than the proxy-mode "basic SSH".
- **Docker Command**: this is the entrypoint that runs `setup-pod.sh` on every boot. If this field is empty or wrong, the boot script never runs and ComfyUI won't come up automatically.

---

## Resume procedure (every restart)

When the user says "I want to resume" or "restart the pod", follow this exactly:

### 1. Restart the pod
- RunPod console → your pod → **Stop** (wait until status = "Stopped")
- Click **Start**

### 2. Wait for the boot script to finish (~3 min)
The Docker Command pulls `setup-pod.sh` and runs it. The script:
1. Installs `openssh-server` and writes the operator pubkey to `~/.ssh/authorized_keys`, starts `sshd`
2. `pip install -r /workspace/ComfyUI/requirements.txt` (this silently downgrades torch to cu121)
3. `pip install -r` for each `custom_nodes/*/requirements.txt`
4. Installs `insightface`, `onnxruntime-gpu`, `pyOpenSSL`, `watchdog`
5. **Uninstalls** the cu121 torch + nvidia/triton wheels, **purges** the pip cache, **reinstalls** torch+vision+audio for cu124 (this fixes the "PyTorch and TorchAudio were compiled with different CUDA versions" crash)
6. Starts ComfyUI on port 3000 (foreground; this becomes the container's main process)

To peek at progress, open RunPod's **Web Terminal** and run:
```bash
tail -f /workspace/setup.log 2>/dev/null || ps -ef | grep -E 'setup|pip|main.py' | grep -v grep
```
You'll know it's done when `python main.py --listen --port 3000` is the running process.

### 3. Get the new SSH string
- RunPod console → your pod → **Connect** → **SSH over exposed TCP** tab (NOT "Basic SSH")
- Copy the line: `ssh root@<new-ip> -p <new-port> -i ~/.ssh/id_ed25519`
- The IP and port change on every restart — this is normal.

### 4. Get the proxy URL
- The HTTP proxy URL pattern is `https://<RUNPOD_POD_ID>-3000.proxy.runpod.net/`
- The pod ID is shown in **Connect → HTTP Service [Port 3000]**, or via SSH: `cat /proc/1/environ | tr '\0' '\n' | grep RUNPOD_POD_ID`
- Open in **incognito** (regular tab caches old pod sessions and returns 403)

### 5. Tell Claude
Paste the SSH connection string from step 3. Claude will:
- Update the `runpod` host alias in `~/.ssh/config` (HostName + Port)
- Run a quick test connection
- Start running workflows again

---

## What persists vs. what gets wiped on restart

**Persists** (network volume `/workspace/`):
- `/workspace/ComfyUI/` — full install
- `/workspace/ComfyUI/models/` — checkpoints, controlnets, ipadapter, clip_vision
- `/workspace/ComfyUI/custom_nodes/` — installed custom nodes
- `/workspace/ComfyUI/input/` — uploaded reference images, masks, pose grids
- `/workspace/ComfyUI/output/` — generated images
- `/workspace/ComfyUI/user/default/workflows/` — saved workflows
- `/workspace/setup.log`, `/workspace/comfyui.log` — last-boot logs (overwritten each restart)

**Wiped** (container disk):
- `/usr/local/lib/python3.11/dist-packages/` — pip packages reinstall each boot
- `openssh-server` — reinstalled each boot by the script
- `~/` (`/root/`) — gets re-set up by the script (only `~/.ssh/authorized_keys` matters)
- `/tmp/` — ephemeral

---

## Troubleshooting

### "Connection refused" on SSH right after restart
Boot script hasn't reached the sshd install step yet. Wait ~30 sec and retry. If still failing after 2 min, open Web Terminal and check `/workspace/setup.log`.

### ComfyUI never comes up; `/tmp/setup.sh` doesn't exist
The Docker Command field is empty or wrong. Edit the pod template and add the wget+bash one-liner from the table above.

### `RuntimeError: PyTorch and TorchAudio were compiled with different CUDA versions`
The torch reinstall step in `setup-pod.sh` failed. Most common cause: container disk full. Check `df -h /` on the pod. The script handles this by uninstalling cu121 + purging cache before installing cu124, but if it gets killed mid-way you may need to run it again manually:
```bash
ssh runpod "wget -qO /tmp/setup.sh https://raw.githubusercontent.com/DirckM/fotograph-tool/main/comfyui/setup-pod.sh && nohup bash /tmp/setup.sh </dev/null >/workspace/setup.log 2>&1 & disown"
```

### Proxy URL returns 403
Browser has stale cookies from a previous pod. Open in incognito or clear cookies for `*.proxy.runpod.net`.

### Proxy URL returns 404
Port 3000 is not in **Expose HTTP Ports** in the pod template. Edit template → add `3000` → save. Note: editing some template fields triggers a pod restart, which assigns a new IP/port.

### Proxy URL returns 502
ComfyUI not running on the pod. SSH in and check: `ss -tlnp | grep 3000`. If no process is listening, run setup-pod.sh again or start ComfyUI manually:
```bash
cd /workspace/ComfyUI && nohup python main.py --listen --port 3000 </dev/null >/workspace/comfyui.log 2>&1 & disown
```

---

## Cost
- **Running**: ~$0.69/hr (RTX 4090) + ~$0.003/hr (container disk)
- **Stopped**: network volume only ≈ $7/month (100 GB)
- Terminate the pod when you're done for the day. Network volume + saved workflows + models persist independently.
