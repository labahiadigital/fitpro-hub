import asyncio, sys
name = _args[0] if '_args' in dir() else 'shot.png'
coro = browser._session._cdp_set_viewport(width=390, height=844, device_scale_factor=2, mobile=True)
asyncio.run_coroutine_threadsafe(coro, browser._loop).result(timeout=10)
# small wait for reflow
import time; time.sleep(0.5)
browser.screenshot(name)
print('saved', name)
