"""Run several read-only queries against the DB concurrently.

SQLAlchemy 2.0.46+ refuses to share one `AsyncSession` between concurrent
coroutines, so `asyncio.gather(db.execute(q1), db.execute(q2))` blows up with
``IllegalStateChangeError``. The workaround is to fan out across the pool: each
worker gets its own short-lived session, and we join with ``asyncio.gather``.

For Supabase the pool sits behind PgBouncer (transaction mode on port 6543), so
acquiring N short sessions in parallel is cheap — PgBouncer reuses backend
connections aggressively and collapses the N round-trips into N parallel ones
instead of N sequential ones.

Use only for independent SELECTs. Writes should keep using the request-scoped
session so they share a single transaction.
"""
from __future__ import annotations

import asyncio
from typing import Awaitable, Callable, Tuple, TypeVar

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal

T = TypeVar("T")

Worker = Callable[[AsyncSession], Awaitable[T]]


async def _run_with_session(worker: Worker[T]) -> T:
    async with AsyncSessionLocal() as session:
        return await worker(session)


async def parallel_queries(*workers: Worker) -> Tuple:
    """Execute ``workers`` concurrently, each with its own `AsyncSession`.

    Returns a tuple with one result per worker, in order. Exceptions bubble up
    from the first worker that fails, cancelling the rest.
    """
    if not workers:
        return ()
    return await asyncio.gather(*(_run_with_session(w) for w in workers))
