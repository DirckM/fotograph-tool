#!/usr/bin/env python3
"""Florence-2 pass over the raw dataset.

For every image: generates a detailed caption, runs OCR, and from those
derives a gender guess and a magazine-layout flag. Writes one JSON line per
image to curation.jsonl so the curation step can sort files without re-running
the model.

Usage: python3 florence-curate.py
"""
import os, json, glob
# Florence-2's remote modeling file hard-imports flash_attn; it runs fine on
# sdpa without it. Neutralise transformers' import check before anything else.
import transformers.dynamic_module_utils as _dmu
_dmu.check_imports = lambda filename: []

import torch
from PIL import Image
from transformers import AutoProcessor, AutoModelForCausalLM

IMG_DIR = "/workspace/dataset/raw"
OUT     = "/workspace/dataset/curation.jsonl"
MODEL   = "microsoft/Florence-2-large"

device = "cuda"
torch.set_grad_enabled(False)
print("loading Florence-2...", flush=True)
model = AutoModelForCausalLM.from_pretrained(
    MODEL, trust_remote_code=True, torch_dtype=torch.float16,
    attn_implementation="sdpa").to(device).eval()
processor = AutoProcessor.from_pretrained(MODEL, trust_remote_code=True)

def run(image, task):
    inputs = processor(text=task, images=image, return_tensors="pt").to(device, torch.float16)
    gen = model.generate(input_ids=inputs["input_ids"], pixel_values=inputs["pixel_values"],
                         max_new_tokens=1024, num_beams=3, do_sample=False)
    text = processor.batch_decode(gen, skip_special_tokens=False)[0]
    return processor.post_process_generation(text, task=task,
                                             image_size=(image.width, image.height))[task]

MALE   = ["man ", "male", " boy", "gentleman", "men ", "his "]
FEMALE = ["woman", "female", "girl", "lady", "women", "her "]
LAYOUT = ["magazine", "collage", "poster", "two photo", "multiple photo",
          "grid of", "side by side", "split image"]

imgs = sorted(glob.glob(os.path.join(IMG_DIR, "*.jpg")))
print(f"{len(imgs)} images to process", flush=True)
done = 0
with open(OUT, "w") as out:
    for i, p in enumerate(imgs):
        try:
            im = Image.open(p).convert("RGB")
        except Exception as e:
            print(f"  skip {os.path.basename(p)}: {e}", flush=True)
            continue
        cap = run(im, "<MORE_DETAILED_CAPTION>")
        ocr = run(im, "<OCR>")
        low = cap.lower()
        f = sum(low.count(w) for w in FEMALE)
        m = sum(low.count(w) for w in MALE)
        gender = "female" if f > m else ("male" if m > f else "unknown")
        ocr_len = len((ocr or "").strip())
        ar = im.width / im.height
        is_layout = ocr_len > 60 or ar > 1.3 or any(h in low for h in LAYOUT)
        out.write(json.dumps({
            "file": os.path.basename(p), "w": im.width, "h": im.height,
            "ar": round(ar, 3), "caption": cap, "ocr_len": ocr_len,
            "gender": gender, "is_layout": is_layout,
        }) + "\n")
        out.flush()
        done += 1
        if i % 50 == 0:
            print(f"{i}/{len(imgs)}", flush=True)
print(f"done: {done} records -> {OUT}", flush=True)
