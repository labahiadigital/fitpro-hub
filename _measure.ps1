$routes = @(
  "/dashboard","/clients","/workouts","/nutrition","/calendar","/lms","/payments","/messages","/reports","/products","/machines","/settings"
)
foreach ($r in $routes) {
  & browser-use open "http://localhost:5177$r" 2>&1 | Out-Null
  Start-Sleep -Milliseconds 4500
  $jsonExpr = "JSON.stringify({route:'$r',fcp:Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime||0),dom:Math.round(performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd||0),load:Math.round(performance.getEntriesByType('navigation')[0]?.loadEventEnd||0),apiCount:performance.getEntriesByType('resource').filter(x=>x.name.includes('/api/v1/')).length,slowApi:performance.getEntriesByType('resource').filter(x=>x.name.includes('/api/v1/')&&x.duration>250).map(x=>({u:x.name.split('/api/v1/')[1].substring(0,60),d:Math.round(x.duration)})).sort((a,b)=>b.d-a.d).slice(0,6)})"
  $out = & browser-use eval $jsonExpr 2>&1 | Out-String
  $line = ($out -split "`n" | Where-Object { $_ -match "result:" }) -replace "^result:\s*",""
  Write-Host $line
  & browser-use eval "performance.clearResourceTimings()" 2>&1 | Out-Null
}
