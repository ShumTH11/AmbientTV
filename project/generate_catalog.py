#!/usr/bin/env python3
"""
Generates content_catalog.json using real API data.

Sources:
  - Pexels API (video, HD landscape)
  - Pixabay Music API (audio, 10+ min ambient loops)
  - Coverr API (video fallback)
  - Internet Archive (audio fallback)

Requires env vars (or hardcoded fallback keys):
  PEXELS_API_KEY, PIXABAY_API_KEY, COVERR_API_KEY

Usage:
  python generate_catalog.py
  python generate_catalog.py --pairs 3   # 3 pairs per category
"""

import json
import urllib.request
import urllib.parse
import os
import sys
import argparse

# Load keys from env with fallback to hardcoded (for dev)
PEXELS_KEY = os.getenv("PEXELS_API_KEY", "AGilLvbLs6vml5HDLWWehaPY9Q8iJZiqi2ntxDOtT4vwdnadFxpD6hhX")
PIXABAY_KEY = os.getenv("PIXABAY_API_KEY", "55994989-f72f02df2e8b86e00a8add31a")
COVERR_KEY = os.getenv("COVERR_API_KEY", "91f470b4593f2787c9fbc5d88e091062")

CATEGORIES = {
    "nature": {
        "video_query": "nature forest relaxing landscape",
        "audio_queries": ["nature ambient sleep", "forest rain relaxing", "calm piano nature"],
        "tags": [{"key": "mood", "value": "calm"}, {"key": "genre", "value": "ambient"}]
    },
    "cyberpunk": {
        "video_query": "cyberpunk neon city night futuristic",
        "audio_queries": ["synthwave ambient", "dark ambient electronic", "cyberpunk music"],
        "tags": [{"key": "mood", "value": "dark"}, {"key": "genre", "value": "synthwave"}]
    },
    "christmas": {
        "video_query": "christmas snow winter lights cozy",
        "audio_queries": ["christmas ambient instrumental", "winter piano", "holiday relaxing"],
        "tags": [{"key": "mood", "value": "festive"}, {"key": "genre", "value": "christmas"}]
    },
    "fantasy": {
        "video_query": "fantasy castle medieval landscape epic",
        "audio_queries": ["fantasy orchestral ambient", "epic ambient music", "medieval lute"],
        "tags": [{"key": "mood", "value": "epic"}, {"key": "genre", "value": "orchestral"}]
    },
    "steampunk": {
        "video_query": "steampunk gears industrial victorian",
        "audio_queries": ["steampunk ambient", "industrial ambient", "dark mechanical"],
        "tags": [{"key": "mood", "value": "industrial"}, {"key": "genre", "value": "steampunk"}]
    },
}


def fetch_pexels_video(query):
    """Fetch HD video from Pexels."""
    url = f"https://api.pexels.com/videos/search?query={urllib.parse.quote(query)}&per_page=1&orientation=landscape"
    req = urllib.request.Request(url, headers={"Authorization": PEXELS_KEY, "User-Agent": "AmbientTV/2.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            videos = data.get("videos", [])
            if not videos:
                return None
            v = videos[0]
            best = None
            for f in v.get("video_files", []):
                if f.get("file_type") == "video/mp4":
                    w = f.get("width", 0)
                    if w == 1920:
                        best = f["link"]
                        break
                    if w == 1280 and best is None:
                        best = f["link"]
            if best is None:
                for f in v.get("video_files", []):
                    if f.get("file_type") == "video/mp4":
                        best = f["link"]
                        break
            page_url = v.get("url", "")
            slug = page_url.rstrip("/").split("/")[-1] if page_url else ""
            if slug and "-" in slug:
                parts = slug.split("-")
                if parts[-1].isdigit():
                    parts = parts[:-1]
                title = " ".join(parts).title()
            else:
                title = query.title()
            return {"url": best, "title": title, "duration": v.get("duration", 0)}
    except Exception as e:
        print(f"  [Pexels] error: {e}", file=sys.stderr)
        return None


def fetch_pixabay_audio(query, duration="600+"):
    """Fetch long ambient audio from Pixabay Music API.
    duration: 0-30, 30-120, 120-300, 300-600, 600+
    """
    url = (
        f"https://pixabay.com/api/audio/?key={PIXABAY_KEY}"
        f"&q={urllib.parse.quote(query)}"
        f"&duration={duration}"
        f"&per_page=5"
        f"&order=popular"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "AmbientTV/2.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            hits = data.get("hits", [])
            if not hits:
                return None
            h = hits[0]
            return {
                "url": h.get("audio", ""),
                "title": h.get("title", query),
                "duration": h.get("duration", 0),
                "tags": h.get("tags", ""),
            }
    except Exception as e:
        print(f"  [Pixabay] error: {e}", file=sys.stderr)
        return None


def fetch_archive_audio(query):
    """Fetch audio from Internet Archive (fallback)."""
    search_url = (
        f"https://archive.org/advancedsearch.php?"
        f"q={urllib.parse.quote(query)}+AND+mediatype:audio"
        f"&fl[]=identifier,title,downloads"
        f"&sort[]=downloads+desc"
        f"&rows=3&page=1&output=json&save=yes"
    )
    try:
        with urllib.request.urlopen(search_url, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            docs = data.get("response", {}).get("docs", [])
            for doc in docs:
                identifier = doc.get("identifier")
                if not identifier:
                    continue
                meta_url = f"https://archive.org/metadata/{identifier}/files"
                with urllib.request.urlopen(meta_url, timeout=30) as mresp:
                    meta = json.loads(mresp.read().decode())
                    files = meta.get("result", [])
                    for f in files:
                        name = f.get("name", "")
                        size = f.get("size", "0")
                        try:
                            size_int = int(size)
                        except (ValueError, TypeError):
                            size_int = 0
                        if name.lower().endswith((".mp3", ".ogg")) and size_int > 500_000:
                            return {
                                "url": f"https://archive.org/download/{identifier}/{name}",
                                "title": doc.get("title", query),
                                "duration": 0,
                            }
    except Exception as e:
        print(f"  [Archive] error: {e}", file=sys.stderr)
    return None


def fetch_audio(query, duration="600+"):
    """Try Pixabay first, then Archive fallback."""
    audio = fetch_pixabay_audio(query, duration)
    if audio and audio.get("url"):
        print(f"    [Pixabay] {audio['title']} ({audio['duration']}s)")
        return audio
    audio = fetch_archive_audio(query)
    if audio:
        print(f"    [Archive fallback] {audio['title']}")
        return audio
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pairs", type=int, default=3, help="Pairs per category")
    parser.add_argument("--output", type=str, default=None, help="Output path")
    args = parser.parse_args()

    # Default output: backend/data/content_catalog.json (preferred) or android assets
    if args.output:
        output_path = args.output
    else:
        backend_path = os.path.join(os.path.dirname(__file__), "..", "backend", "data", "content_catalog.json")
        android_path = os.path.join(os.path.dirname(__file__), "app", "src", "main", "assets", "content_catalog.json")
        output_path = backend_path if os.path.exists(os.path.dirname(backend_path)) else android_path

    catalog = {"version": 2, "categories": []}

    for cat_id, cfg in CATEGORIES.items():
        print(f"\nFetching {cat_id} ...")
        video = fetch_pexels_video(cfg["video_query"])
        if not video:
            print(f"  SKIP: no video")
            continue

        pairs = []
        for i, aq in enumerate(cfg["audio_queries"]):
            if len(pairs) >= args.pairs:
                break
            print(f"  Searching audio #{i+1}: {aq}")
            audio = fetch_audio(aq, duration="600+")
            if audio:
                pair_title = f"{video['title']} — {audio['title']}"
                pairs.append({
                    "videoUrl": video["url"],
                    "audioUrl": audio["url"],
                    "title": pair_title[:80],
                    "tags": cfg["tags"]
                })
                print(f"    OK: {pair_title[:70]}...")
            else:
                print(f"    SKIP: no audio found")

        if pairs:
            catalog["categories"].append({"id": cat_id, "pairs": pairs})
            print(f"  -> {len(pairs)} pairs")
        else:
            print(f"  SKIP: no audio for category")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    print(f"\nSaved {len(catalog['categories'])} categories ({sum(len(c['pairs']) for c in catalog['categories'])} pairs) to {output_path}")


if __name__ == "__main__":
    main()
