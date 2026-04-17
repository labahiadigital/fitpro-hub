import asyncio, re
coro = browser._session._cdp_set_viewport(width=390, height=844, device_scale_factor=2, mobile=True)
asyncio.run_coroutine_threadsafe(coro, browser._loop).result(timeout=10)
h = browser.html
m = re.findall(r'href="(/clients/[^"\s]+)"', h)
print("hrefs", m[:8])
m2 = re.findall(r'data-client-id="([^"]+)"', h)
print("ids", m2[:5])
