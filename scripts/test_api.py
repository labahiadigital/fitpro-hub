"""Quick API test to check rate limits and errors."""
import requests
import json
import os
import time

API_KEY = os.environ.get("NANOBANANA_API_KEY", "")
API_URL = "https://api.laozhang.ai/v1beta/models/gemini-3-pro-image-preview:generateContent"

headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
payload = {
    "contents": [{"parts": [{"text": "A photo of a man doing jumping jacks in a gym"}]}],
    "generationConfig": {
        "responseModalities": ["IMAGE"],
        "imageConfig": {"aspectRatio": "4:5", "imageSize": "1K"},
    },
}

for i in range(3):
    print(f"\nTest {i+1}:")
    try:
        resp = requests.post(API_URL, headers=headers, json=payload, timeout=120)
        result = resp.json()
        if "error" in result:
            print(f"  ERROR: {json.dumps(result['error'], indent=2)}")
        elif "candidates" in result:
            data = result["candidates"][0]["content"]["parts"][0].get("inlineData", {}).get("data", "")
            print(f"  SUCCESS: {len(data)} chars base64")
        else:
            print(f"  UNEXPECTED: {list(result.keys())}")
    except Exception as e:
        print(f"  EXCEPTION: {e}")
    time.sleep(5)
