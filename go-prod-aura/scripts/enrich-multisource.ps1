$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsaG9lZmRyamJ3ZHppaml6cnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjQwMDksImV4cCI6MjA3NjcwMDAwOX0.0MsuCqdT4mmnNZci7otwKm5iQLbUvPs58Ihafs_5940"
    "Content-Type" = "application/json"
}

$artists = @(
    @{ id = "b1612c0e-d48b-4cb5-ad9d-8dc80e277a5e"; name = "L2B" },
    @{ id = "0c62f386-677f-4f1e-8c7f-b02b535f864b"; name = "Nono La Grinta" },
    @{ id = "22c361a7-e466-4de1-97e3-d43ac510b053"; name = "JOSMAN" }
)

foreach ($artist in $artists) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Enriching: $($artist.name)" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    
    $body = @{
        artist_id = $artist.id
        force = $true
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "https://alhoefdrjbwdzijizrxc.supabase.co/functions/v1/enrich-artist-multisource" -Method POST -Headers $headers -Body $body -TimeoutSec 120
        Write-Host "Status: $($response.status)" -ForegroundColor Green
        Write-Host "Sources: $($response.sources_successful)/$($response.sources_processed)" -ForegroundColor Green
    } catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 2
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "DONE - All 3 artists enriched!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green







