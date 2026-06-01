import os
import json
import redis.asyncio as redis
from typing import Dict, Any

# Redis pub/sub emitter for SwarmDev events
# Events published here are bridged to Socket.io by the API server

_redis_client: redis.Redis | None = None
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

async def _get_redis() -> redis.Redis:
    """Get or create Redis connection."""
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(REDIS_URL, decode_responses=True)
            await _redis_client.ping()
        except Exception as e:
            print(f"[socket_emitter] Redis connection failed: {e}")
            raise
    return _redis_client

async def emit(event: str, data: Dict[str, Any]):
    """Publish an event to the Redis channel for Socket.io bridging.

    Events are published to 'swarmdev:events' channel and forwarded to
    Socket.io clients by the API server's Redis bridge.

    Args:
        event: Event type (agent_status, agent_log, file_created, etc.)
        data: Event payload dictionary
    """
    try:
        r = await _get_redis()
        message = json.dumps({
            "type": event,
            "payload": data,
        })
        await r.publish("swarmdev:events", message)
    except Exception as e:
        # Log but don't raise - event emission is best-effort
        print(f"[socket_emitter] Failed to emit event {event}: {e}")

async def close():
    """Close Redis connection."""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
