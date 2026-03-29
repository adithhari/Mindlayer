# ─────────────────────────────────────────────────────────────────────────────
# MindLayer API Proxy — FastAPI Backend
# ─────────────────────────────────────────────────────────────────────────────
# Holds ALL secret API keys server-side. The frontend calls /api/* endpoints
# which proxy to Claude, Hume, Deepgram, and Supermemory — no keys in the browser.
#
# Run:
#   cd backend
#   pip install -r requirements.txt
#   uvicorn main:app --reload --port 8000
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import FastAPI, Request, Response, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv
import httpx
import os
import json
from datetime import datetime, timedelta

load_dotenv()

# ── Secret keys (server-side only — NEVER sent to browser) ──────────────────
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
HUME_API_KEY = os.getenv("HUME_API_KEY", "")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")
SUPERMEMORY_API_KEY = os.getenv("SUPERMEMORY_API_KEY", "")

# ── Config ──────────────────────────────────────────────────────────────────
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-opus-4-6")
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
HUME_BATCH_URL = "https://api.hume.ai/v0/batch/jobs"
DEEPGRAM_STT_URL = "https://api.deepgram.com/v1/listen"
DEEPGRAM_TTS_URL = "https://api.deepgram.com/v1/speak"
SUPERMEMORY_URL = "https://api.supermemory.ai/v3"

# ── NPPES / SAMHSA (free, no keys needed) ───────────────────────────────────
NPPES_API_URL = "https://npiregistry.cms.hhs.gov/api/"
SAMHSA_API_URL = "https://findtreatment.gov/locator/listing"

app = FastAPI(title="MindLayer API Proxy", version="1.0.0")

# ── CORS — allow Vite dev server ────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared async HTTP client (connection pooling)
http_client = httpx.AsyncClient(timeout=30.0)

# ── Simple in-memory cache for therapist results ────────────────────────────
_cache = {}
CACHE_TTL = timedelta(hours=6)

def cache_get(key: str):
    if key in _cache:
        data, expires = _cache[key]
        if datetime.now() < expires:
            return data
        del _cache[key]
    return None

def cache_set(key: str, data):
    _cache[key] = (data, datetime.now() + CACHE_TTL)


# ─────────────────────────────────────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "keys_configured": {
            "anthropic": bool(ANTHROPIC_API_KEY),
            "hume": bool(HUME_API_KEY),
            "deepgram": bool(DEEPGRAM_API_KEY),
            "supermemory": bool(SUPERMEMORY_API_KEY),
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# CLAUDE PROXY — POST /api/claude
# ─────────────────────────────────────────────────────────────────────────────

class ClaudeRequest(BaseModel):
    system: str
    message: str
    model: Optional[str] = None
    max_tokens: Optional[int] = 1000

@app.post("/api/claude")
async def proxy_claude(req: ClaudeRequest):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(500, "ANTHROPIC_API_KEY not configured on server")

    resp = await http_client.post(
        ANTHROPIC_URL,
        headers={
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
        },
        json={
            "model": req.model or CLAUDE_MODEL,
            "max_tokens": req.max_tokens,
            "system": req.system,
            "messages": [{"role": "user", "content": req.message}],
        },
    )

    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"Claude API error: {resp.text}")

    return resp.json()


# ─────────────────────────────────────────────────────────────────────────────
# HUME PROXY
# ─────────────────────────────────────────────────────────────────────────────

class HumeSubmitRequest(BaseModel):
    text: str

@app.post("/api/hume/submit")
async def proxy_hume_submit(req: HumeSubmitRequest):
    if not HUME_API_KEY:
        raise HTTPException(500, "HUME_API_KEY not configured on server")

    resp = await http_client.post(
        HUME_BATCH_URL,
        headers={
            "X-Hume-Api-Key": HUME_API_KEY,
            "Content-Type": "application/json",
        },
        json={"text": [req.text], "models": {"language": {}}},
    )

    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"Hume submit error: {resp.text}")

    return resp.json()

@app.get("/api/hume/status/{job_id}")
async def proxy_hume_status(job_id: str):
    if not HUME_API_KEY:
        raise HTTPException(500, "HUME_API_KEY not configured on server")

    resp = await http_client.get(
        f"{HUME_BATCH_URL}/{job_id}",
        headers={"X-Hume-Api-Key": HUME_API_KEY},
    )

    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"Hume status error: {resp.text}")

    return resp.json()

@app.get("/api/hume/predictions/{job_id}")
async def proxy_hume_predictions(job_id: str):
    if not HUME_API_KEY:
        raise HTTPException(500, "HUME_API_KEY not configured on server")

    resp = await http_client.get(
        f"{HUME_BATCH_URL}/{job_id}/predictions",
        headers={"X-Hume-Api-Key": HUME_API_KEY},
    )

    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"Hume predictions error: {resp.text}")

    return resp.json()


# ─────────────────────────────────────────────────────────────────────────────
# DEEPGRAM PROXY
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/deepgram/stt")
async def proxy_deepgram_stt(request: Request):
    if not DEEPGRAM_API_KEY:
        raise HTTPException(500, "DEEPGRAM_API_KEY not configured on server")

    content_type = request.headers.get("content-type", "audio/webm")
    body = await request.body()

    params = {"model": "nova-2", "language": "en"}
    if "wav" in content_type or "raw" in content_type:
        params["encoding"] = "linear16"
        params["sample_rate"] = "16000"

    resp = await http_client.post(
        DEEPGRAM_STT_URL,
        params=params,
        headers={
            "Authorization": f"Token {DEEPGRAM_API_KEY}",
            "Content-Type": content_type,
        },
        content=body,
    )

    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"Deepgram STT error: {resp.text}")

    return resp.json()

class TTSRequest(BaseModel):
    text: str

@app.post("/api/deepgram/tts")
async def proxy_deepgram_tts(req: TTSRequest):
    if not DEEPGRAM_API_KEY:
        raise HTTPException(500, "DEEPGRAM_API_KEY not configured on server")

    resp = await http_client.post(
        DEEPGRAM_TTS_URL,
        headers={
            "Authorization": f"Token {DEEPGRAM_API_KEY}",
            "Content-Type": "application/json",
        },
        json={"text": req.text},
    )

    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"Deepgram TTS error: {resp.text}")

    return Response(
        content=resp.content,
        media_type=resp.headers.get("content-type", "audio/mpeg"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# SUPERMEMORY PROXY
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/memory/add")
async def proxy_memory_add(request: Request):
    if not SUPERMEMORY_API_KEY:
        raise HTTPException(500, "SUPERMEMORY_API_KEY not configured on server")

    body = await request.json()
    resp = await http_client.post(
        f"{SUPERMEMORY_URL}/add",
        headers={
            "Authorization": f"Bearer {SUPERMEMORY_API_KEY}",
            "Content-Type": "application/json",
        },
        json=body,
    )

    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"Supermemory add error: {resp.text}")

    return resp.json()

@app.post("/api/memory/search")
async def proxy_memory_search(request: Request):
    if not SUPERMEMORY_API_KEY:
        raise HTTPException(500, "SUPERMEMORY_API_KEY not configured on server")

    body = await request.json()
    resp = await http_client.post(
        f"{SUPERMEMORY_URL}/search",
        headers={
            "Authorization": f"Bearer {SUPERMEMORY_API_KEY}",
            "Content-Type": "application/json",
        },
        json=body,
    )

    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"Supermemory search error: {resp.text}")

    return resp.json()


# ─────────────────────────────────────────────────────────────────────────────
# THERAPIST FINDER — NPPES NPI Registry (FREE, no API key)
# ─────────────────────────────────────────────────────────────────────────────
# The NPPES (National Plan and Provider Enumeration System) is a free US
# government database of every licensed healthcare provider. We search by
# mental health taxonomy codes to find therapists, psychologists, psychiatrists,
# and counselors near the user.
#
# Taxonomy codes for mental health providers:
#   101YM0800X — Counselor, Mental Health
#   101YP0001X — Counselor, Addiction
#   103T00000X — Psychologist, Clinical
#   103TP0016X — Psychologist, Prescribing
#   2084P0800X — Psychiatrist
#   106H00000X — Marriage & Family Therapist
#   104100000X — Social Worker, Clinical
#   101YA0400X — Counselor, Addiction
# ─────────────────────────────────────────────────────────────────────────────

MENTAL_HEALTH_TAXONOMIES = {
    "101YM0800X": "Mental Health Counselor",
    "103T00000X": "Clinical Psychologist",
    "2084P0800X": "Psychiatrist",
    "106H00000X": "Marriage & Family Therapist",
    "104100000X": "Clinical Social Worker",
    "101YP0001X": "Addiction Counselor",
    "103TP0016X": "Prescribing Psychologist",
}

@app.get("/api/therapists/search")
async def search_therapists(
    city: str = Query(..., description="City name"),
    state: str = Query(..., description="2-letter state code, e.g. IN"),
    specialty: Optional[str] = Query(None, description="Specialty filter: counselor, psychologist, psychiatrist, social_worker, all"),
    limit: int = Query(15, ge=1, le=50),
):
    """
    Search for licensed mental health providers via NPPES.
    Free, no API key, returns verified NPI-registered providers.
    """
    cache_key = f"nppes:{city}:{state}:{specialty}:{limit}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    # Map specialty to taxonomy codes
    taxonomy_filter = None
    if specialty == "counselor":
        taxonomy_filter = "101YM0800X"
    elif specialty == "psychologist":
        taxonomy_filter = "103T00000X"
    elif specialty == "psychiatrist":
        taxonomy_filter = "2084P0800X"
    elif specialty == "social_worker":
        taxonomy_filter = "104100000X"

    params = {
        "version": "2.1",
        "city": city,
        "state": state,
        "limit": limit,
        "skip": 0,
    }

    if taxonomy_filter:
        params["taxonomy_description"] = MENTAL_HEALTH_TAXONOMIES.get(taxonomy_filter, "Mental Health")
    else:
        params["taxonomy_description"] = "Mental Health"

    try:
        resp = await http_client.get(NPPES_API_URL, params=params)

        if resp.status_code != 200:
            raise HTTPException(502, f"NPPES API error: {resp.status_code}")

        data = resp.json()
        results = data.get("results", [])

        # Transform NPPES results into a clean format
        providers = []
        for r in results:
            # Extract basic info
            basic = r.get("basic", {})
            addresses = r.get("addresses", [])
            taxonomies = r.get("taxonomies", [])

            # Find practice address (location_type 2 = practice)
            practice_addr = None
            for addr in addresses:
                if addr.get("address_purpose") == "LOCATION":
                    practice_addr = addr
                    break
            if not practice_addr and addresses:
                practice_addr = addresses[0]

            # Find primary taxonomy
            primary_tax = None
            for tax in taxonomies:
                if tax.get("primary"):
                    primary_tax = tax
                    break
            if not primary_tax and taxonomies:
                primary_tax = taxonomies[0]

            # Build clean provider object
            is_org = r.get("enumeration_type") == "NPI-2"
            if is_org:
                name = basic.get("organization_name", "Unknown Provider")
            else:
                first = basic.get("first_name", "")
                last = basic.get("last_name", "")
                credential = basic.get("credential", "")
                name = f"{first} {last}".strip()
                if credential:
                    name += f", {credential}"

            provider = {
                "npi": r.get("number"),
                "name": name,
                "type": "organization" if is_org else "individual",
                "specialty": primary_tax.get("desc", "Mental Health") if primary_tax else "Mental Health",
                "taxonomy_code": primary_tax.get("code", "") if primary_tax else "",
                "address": {
                    "line1": practice_addr.get("address_1", "") if practice_addr else "",
                    "line2": practice_addr.get("address_2", "") if practice_addr else "",
                    "city": practice_addr.get("city", "") if practice_addr else "",
                    "state": practice_addr.get("state", "") if practice_addr else "",
                    "zip": practice_addr.get("postal_code", "")[:5] if practice_addr else "",
                },
                "phone": practice_addr.get("telephone_number", "") if practice_addr else "",
            }

            providers.append(provider)

        result = {
            "query": {"city": city, "state": state, "specialty": specialty},
            "count": len(providers),
            "providers": providers,
            "source": "NPPES NPI Registry (CMS.gov)",
            "disclaimer": "This is a directory of licensed providers, not a recommendation. Please verify availability and insurance coverage directly.",
        }

        cache_set(cache_key, result)
        return result

    except httpx.HTTPError as e:
        raise HTTPException(502, f"Failed to reach NPPES: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# SAMHSA TREATMENT LOCATOR — Free government API
# ─────────────────────────────────────────────────────────────────────────────
# Finds behavioral health treatment facilities (clinics, hospitals, programs)
# near a location. Covers substance use + mental health facilities.
# Complements NPPES (which covers individual practitioners).
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/therapists/facilities")
async def search_facilities(
    city: str = Query(..., description="City name"),
    state: str = Query(..., description="2-letter state code"),
    limit: int = Query(10, ge=1, le=30),
):
    """
    Search SAMHSA's treatment locator for behavioral health facilities.
    Free, no API key.
    """
    cache_key = f"samhsa:{city}:{state}:{limit}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    # SAMHSA uses a different API format — search by city/state
    params = {
        "sType": "MH",  # Mental Health
        "sAddr": f"{city}, {state}",
        "pageSize": limit,
        "page": 1,
        "sort": 0,  # Distance
        "limitType": 2,  # Miles
        "limitValue": 25,  # Within 25 miles
    }

    try:
        resp = await http_client.get(
            "https://findtreatment.gov/locator/listing",
            params=params,
            headers={"Accept": "application/json"},
            follow_redirects=True,
        )

        # SAMHSA may return HTML instead of JSON — handle gracefully
        content_type = resp.headers.get("content-type", "")
        if "json" not in content_type:
            # Fallback: return empty with message
            return {
                "query": {"city": city, "state": state},
                "count": 0,
                "facilities": [],
                "source": "SAMHSA FindTreatment.gov",
                "note": "SAMHSA search returned non-JSON response. Try visiting findtreatment.gov directly.",
                "fallback_url": f"https://findtreatment.gov/locator?sAddr={city}%2C+{state}&sType=MH",
            }

        data = resp.json()

        # Extract facility info from SAMHSA response
        rows = data if isinstance(data, list) else data.get("rows", data.get("results", []))

        facilities = []
        for row in rows[:limit]:
            facility = {
                "name": row.get("name1", row.get("name", "Unknown Facility")),
                "address": {
                    "line1": row.get("street1", row.get("address", "")),
                    "city": row.get("city", ""),
                    "state": row.get("state", ""),
                    "zip": row.get("zip", ""),
                },
                "phone": row.get("phone", ""),
                "website": row.get("website", ""),
                "services": row.get("services", []),
                "distance_miles": row.get("miles", None),
            }
            facilities.append(facility)

        result = {
            "query": {"city": city, "state": state},
            "count": len(facilities),
            "facilities": facilities,
            "source": "SAMHSA FindTreatment.gov",
            "search_url": f"https://findtreatment.gov/locator?sAddr={city}%2C+{state}&sType=MH",
            "disclaimer": "This is a directory of treatment facilities. Please call to verify services and availability.",
        }

        cache_set(cache_key, result)
        return result

    except httpx.HTTPError as e:
        # Graceful fallback — always return the direct search URL
        return {
            "query": {"city": city, "state": state},
            "count": 0,
            "facilities": [],
            "source": "SAMHSA FindTreatment.gov",
            "error": f"Could not reach SAMHSA: {str(e)}",
            "fallback_url": f"https://findtreatment.gov/locator?sAddr={city}%2C+{state}&sType=MH",
        }


# ─────────────────────────────────────────────────────────────────────────────
# STATIC CRISIS RESOURCES — Always available, no API call
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/crisis/resources")
async def crisis_resources():
    """Hardcoded crisis resources — never depend on an external API for these."""
    return {
        "resources": [
            {
                "name": "988 Suicide & Crisis Lifeline",
                "action": "Call or text 988",
                "phone": "988",
                "url": "https://988lifeline.org/chat",
                "available": "24/7",
            },
            {
                "name": "Crisis Text Line",
                "action": "Text HOME to 741741",
                "phone": "741741",
                "url": "https://www.crisistextline.org",
                "available": "24/7",
            },
            {
                "name": "SAMHSA National Helpline",
                "action": "Call 1-800-662-4357",
                "phone": "1-800-662-4357",
                "url": "https://www.samhsa.gov/find-help/national-helpline",
                "available": "24/7, free, confidential",
            },
            {
                "name": "Veterans Crisis Line",
                "action": "Call 988, press 1",
                "phone": "988",
                "url": "https://www.veteranscrisisline.net",
                "available": "24/7",
            },
            {
                "name": "IU Counseling and Psychological Services",
                "action": "Call 812-855-5711",
                "phone": "812-855-5711",
                "url": "https://healthcenter.indiana.edu/counseling/",
                "available": "Mon-Fri, after-hours crisis line available",
            },
        ],
        "disclaimer": "If you are in immediate danger, please call 911.",
    }


# ── Cleanup ─────────────────────────────────────────────────────────────────

@app.on_event("shutdown")
async def shutdown():
    await http_client.aclose()
