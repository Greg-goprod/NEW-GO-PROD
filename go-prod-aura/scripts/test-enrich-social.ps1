$supabaseUrl = "https://alhoefdrjbwdzijizrxc.supabase.co"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsaG9lZmRyamJ3ZHppaml6cnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjQwMDksImV4cCI6MjA3NjcwMDAwOX0.0MsuCqdT4mmnNZci7otwKm5iQLUvPs58Ihafs_5940"

$headers = @{
    "Authorization" = "Bearer $anonKey"
    "Content-Type" = "application/json"
}

# Test avec L2B
Write-Host "`n=== Test: L2B ===" -ForegroundColor Cyan
$body = '{"artist_id":"b1612c0e-d48b-4cb5-ad9d-8dc80e277a5e"}'
try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/functions/v1/enrich-social-links" -Method POST -Headers $headers -Body $body -TimeoutSec 60
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test avec Nono La Grinta
Write-Host "`n=== Test: Nono La Grinta ===" -ForegroundColor Yellow
$body = '{"artist_id":"0c62f386-677f-4f1e-8c7f-b02b535f864b"}'
try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/functions/v1/enrich-social-links" -Method POST -Headers $headers -Body $body -TimeoutSec 60
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== DONE ===" -ForegroundColor Green







