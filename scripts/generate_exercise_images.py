"""Generate exercise images using NanoBanana Pro API and upload to Cloudflare R2."""
import requests
import base64
import subprocess
import os
import sys
import tempfile

API_KEY = os.environ.get("NANOBANANA_API_KEY", "")
API_URL = "https://api.laozhang.ai/v1beta/models/gemini-3-pro-image-preview:generateContent"
BUCKET_NAME = "exercise-images"
R2_PUBLIC_BASE = ""

EXERCISES_TO_GENERATE = [
    {
        "id": "0a1d17e1-d9c9-4a37-ae3b-c9af75b7f517",
        "name": "Press Banca con Barra",
        "prompt": "Fitness illustration of a muscular person performing a barbell bench press exercise on a flat bench in a modern gym. Clean, professional style, bright lighting, side angle view showing proper form. No text overlay."
    },
    {
        "id": "e2cf9700-b3df-4a45-920a-1fbc7ad979ad",
        "name": "Sentadilla en Multipower",
        "prompt": "Fitness illustration of a person performing a Smith machine squat exercise in a modern gym. Clean, professional style, bright lighting, side angle view showing proper form with barbell on shoulders. No text overlay."
    },
    {
        "id": "c078081b-1486-46e6-b4c0-5764c3be8634",
        "name": "Jalón al Pecho en Polea Alta",
        "prompt": "Fitness illustration of a person performing a lat pulldown exercise on a cable machine, pulling the bar to the chest. Clean, professional style, bright lighting, front angle view showing proper form. No text overlay."
    },
    {
        "id": "b177d845-eda5-45d8-bf74-0038d77a54a4",
        "name": "Extensión de Tríceps con Cuerda en Polea Alta",
        "prompt": "Fitness illustration of a person performing a cable rope triceps pushdown exercise at a cable machine. Clean, professional style, bright lighting, side angle view showing proper form. No text overlay."
    },
    {
        "id": "5c341fe0-1572-4350-9126-830bc24be471",
        "name": "Hip Thrust con Barra",
        "prompt": "Fitness illustration of a person performing a barbell hip thrust exercise with back against a bench, barbell on hips. Clean, professional style, bright lighting, side angle view showing proper form. No text overlay."
    },
]


def generate_image(prompt: str) -> bytes | None:
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {
                "aspectRatio": "1:1",
                "imageSize": "1K",
            },
        },
    }

    try:
        print(f"  Generating image...")
        response = requests.post(API_URL, headers=headers, json=payload, timeout=120)
        result = response.json()

        if "error" in result:
            print(f"  API Error: {result['error']}")
            return None

        image_data = result["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
        return base64.b64decode(image_data)
    except Exception as e:
        print(f"  Error: {e}")
        return None


def upload_to_r2(image_data: bytes, filename: str) -> str | None:
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp.write(image_data)
        tmp_path = tmp.name

    try:
        key = f"exercises/{filename}"
        cmd = f'wrangler r2 object put "{BUCKET_NAME}/{key}" --file="{tmp_path}" --content-type="image/png"'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=os.path.join(os.path.dirname(__file__), "..", "web"))
        if result.returncode != 0:
            print(f"  Upload error: {result.stderr}")
            return None
        print(f"  Uploaded to R2: {key}")
        return key
    finally:
        os.unlink(tmp_path)


def main():
    print("=" * 60)
    print("Exercise Image Generator - NanoBanana Pro + Cloudflare R2")
    print("=" * 60)

    results = []

    for ex in EXERCISES_TO_GENERATE:
        print(f"\n[{ex['name']}] ({ex['id']})")

        image_data = generate_image(ex["prompt"])
        if not image_data:
            print(f"  FAILED to generate image")
            continue

        print(f"  Image generated: {len(image_data)} bytes")

        filename = f"{ex['id']}.png"
        r2_key = upload_to_r2(image_data, filename)
        if r2_key:
            results.append({"id": ex["id"], "name": ex["name"], "r2_key": r2_key})

    print(f"\n{'=' * 60}")
    print(f"Results: {len(results)}/{len(EXERCISES_TO_GENERATE)} images generated and uploaded")
    for r in results:
        print(f"  - {r['name']}: {r['r2_key']}")

    if results:
        ids_keys = [(r["id"], r["r2_key"]) for r in results]
        print(f"\nR2 keys for DB update:")
        for eid, key in ids_keys:
            print(f"  UPDATE exercises SET image_url = 'exercises/{eid}.png' WHERE id = '{eid}';")


if __name__ == "__main__":
    main()
