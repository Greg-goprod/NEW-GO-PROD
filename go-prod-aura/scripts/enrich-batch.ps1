$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsaG9lZmRyamJ3ZHppaml6cnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjQwMDksImV4cCI6MjA3NjcwMDAwOX0.0MsuCqdT4mmnNZci7otwKm5iQLbUvPs58Ihafs_5940"
    "Content-Type" = "application/json"
}

$body = @{
    company_id = "06f6c960-3f90-41cb-b0d7-46937eaf90a8"
    batch_size = 3
} | ConvertTo-Json

Write-Host "Calling queue-stats v50 (batch_size=3)..."
$response = Invoke-RestMethod -Uri "https://alhoefdrjbwdzijizrxc.supabase.co/functions/v1/queue-stats" -Method POST -Headers $headers -Body $body -TimeoutSec 600
$response | ConvertTo-Json -Depth 5







