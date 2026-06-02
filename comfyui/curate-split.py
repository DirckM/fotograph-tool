#!/usr/bin/env python3
"""Curate the Florence-2 results into kohya-ready training sets.

Reads curation.jsonl and sorts each image:
  - is_layout            -> rejected/   (magazine pages, collages, wide crops)
  - gender == female     -> women/
  - gender == male       -> men/
  - gender == unknown    -> review/     (group shots / ambiguous, inspect by hand)

For women/ and men/ it also writes a kohya caption .txt next to each image:
  "<trigger>, <florence caption>"

Usage: python3 curate-split.py
"""
import os, json, shutil

BASE   = "/workspace/dataset"
RAW    = os.path.join(BASE, "raw")
JSONL  = os.path.join(BASE, "curation.jsonl")
TRIGGER = {"women": "wkeditf", "men": "wkeditm"}

buckets = {b: os.path.join(BASE, b) for b in ("women", "men", "rejected", "review")}
for d in buckets.values():
    os.makedirs(d, exist_ok=True)

counts = {b: 0 for b in buckets}
with open(JSONL) as fh:
    for line in fh:
        line = line.strip()
        if not line:
            continue
        r = json.loads(line)
        src = os.path.join(RAW, r["file"])
        if not os.path.exists(src):
            continue
        if r["is_layout"]:
            bucket = "rejected"
        elif r["gender"] == "female":
            bucket = "women"
        elif r["gender"] == "male":
            bucket = "men"
        else:
            bucket = "review"
        dst = os.path.join(buckets[bucket], r["file"])
        shutil.copy2(src, dst)
        counts[bucket] += 1
        if bucket in TRIGGER:
            stem = os.path.splitext(r["file"])[0]
            cap = f'{TRIGGER[bucket]}, {r["caption"].strip()}'
            with open(os.path.join(buckets[bucket], stem + ".txt"), "w") as cf:
                cf.write(cap)

print("curation complete:")
for b, c in counts.items():
    print(f"  {b:9s}: {c}")
print(f"triggers: women='{TRIGGER['women']}'  men='{TRIGGER['men']}'")
