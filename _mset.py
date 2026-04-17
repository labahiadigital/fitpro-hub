import asyncio
coro = browser._session._cdp_set_viewport(width=390, height=844, device_scale_factor=2, mobile=True)
asyncio.run_coroutine_threadsafe(coro, browser._loop).result(timeout=10)
print('mobile viewport ok')
