import logging
import os

import redis
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

DEFAULT_REDIS_URL = "redis://localhost:6379/0"
REDIS_URL = os.getenv("REDIS_URL", DEFAULT_REDIS_URL)


def get_redis_client() -> redis.Redis:
    """
    Returns a shared Redis client instance.
    decode_responses=True ensures we work with strings directly.
    """
    return redis.Redis.from_url(REDIS_URL, decode_responses=True)


redis_client = get_redis_client()
