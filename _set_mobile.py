import asyncio
coro = browser._session._cdp_set_viewport(width=390, height=844, device_scale_factor=3, mobile=True)
result = browser._loop.run_until_complete(coro) if False else asyncio.run_coroutine_threadsafe(coro, browser._loop).result(timeout=10)
print("viewport set", result)
