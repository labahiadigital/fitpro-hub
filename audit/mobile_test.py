"""Mobile viewport audit using browser-use's Playwright instance."""
import subprocess
import json

pages_to_test = [
    ("login", "/login"),
    ("dashboard", "/dashboard"),
    ("my-workouts", "/my-workouts"),
    ("my-nutrition", "/my-nutrition"),
    ("my-progress", "/my-progress"),
    ("my-calendar", "/my-calendar"),
    ("my-messages", "/my-messages"),
    ("my-profile", "/my-profile"),
]

def run_bu(cmd):
    result = subprocess.run(
        ["browser-use"] + cmd.split(),
        capture_output=True, text=True, encoding="utf-8"
    )
    return result.stdout.strip()

# Start headless browser
run_bu("open http://localhost:5173/login")

# Set viewport to mobile via CDP
run_bu('eval "const cdp=await page.context().newCDPSession(page);await cdp.send(\'Emulation.setDeviceMetricsOverride\',{width:390,height:844,deviceScaleFactor:3,mobile:true});await page.reload();"')

# Login as client
import time
time.sleep(2)

# Get state to find inputs
state = run_bu("state")
print("State after CDP override:", state[:200])

# Take screenshot
print(run_bu(f'screenshot d:\\Web\\IA\\E13 Ftiness\\Plataforma Web\\audit\\mobile_login_cdp.png'))

# Get actual viewport
print(run_bu('eval "JSON.stringify({w:window.innerWidth,h:window.innerHeight,dpr:window.devicePixelRatio})"'))
