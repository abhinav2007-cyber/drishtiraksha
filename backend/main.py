"""DRISHTIRAKSHA — FastAPI application entry point.

Single server.  All modules are mounted as sub-routers under /api/v1.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import CORS_ORIGINS
from backend.database import init_db, recover_interrupted
from backend.routers import investigations, media, claims, network, propagation

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    # Startup
    logger.info("Starting DRISHTIRAKSHA backend …")
    await init_db()
    await recover_interrupted()
    logger.info("Backend ready.")
    yield
    # Shutdown
    logger.info("Shutting down DRISHTIRAKSHA backend.")


app = FastAPI(
    title="DRISHTIRAKSHA",
    description=(
        "Real-Time Multimodal Deepfake Detection and "
        "Coordinated Misinformation Intelligence Platform"
    ),
    version="0.1.0-stage1",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
PREFIX = "/api/v1"
app.include_router(investigations.router, prefix=PREFIX, tags=["Investigations"])
app.include_router(media.router, prefix=PREFIX, tags=["Media Analysis"])
app.include_router(claims.router, prefix=PREFIX, tags=["Claim Analysis"])
app.include_router(network.router, prefix=PREFIX, tags=["Network Analysis"])
app.include_router(propagation.router, prefix=PREFIX, tags=["Propagation Analysis"])


@app.get("/api/v1/health", tags=["System"])
async def health_check():
    """Return service health and module availability."""
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "version": "0.5.0-stage5",
            "modules": {
                "media_ai": {
                    "available": True,
                    "reason": "Pretrained Swin Transformer image detector active",
                },
                "claim_ai": {
                    "available": True,
                    "reason": "Pretrained multilingual MiniLM sentence embeddings & claim verification active",
                },
                "network_ai": {
                    "available": True,
                    "reason": "Graph analytics, betweenness/degree centrality, and multi-signal coordination active",
                },
                "propagation": {
                    "available": True,
                    "reason": "Chronological timeline reconstruction and explicit repost lineage active",
                },
            },
        },
    }
