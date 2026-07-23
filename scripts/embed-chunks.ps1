# Embeds chunks via PowerShell (works when Node.js DNS is blocked on Windows)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot/..

# Load .env
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim().Trim('"'), "Process")
  }
}

$apiKey = $env:OPENAI_API_KEY
if (-not $apiKey) { Write-Error "OPENAI_API_KEY not found in .env" }

$chunksPath = "prisma/chunks-to-embed.json"
if (-not (Test-Path $chunksPath)) { Write-Error "Run: npx tsx scripts/prepare-chunks.ts first" }

$chunks = Get-Content $chunksPath -Raw | ConvertFrom-Json
Write-Host "Embedding $($chunks.Count) chunks via PowerShell..."

$results = @()
$batchSize = 3
for ($i = 0; $i -lt $chunks.Count; $i += $batchSize) {
  $batch = $chunks[$i..([Math]::Min($i + $batchSize - 1, $chunks.Count - 1))]
  $batchNum = [Math]::Floor($i / $batchSize) + 1
  $totalBatches = [Math]::Ceiling($chunks.Count / $batchSize)
  Write-Host "  Batch $batchNum/$totalBatches..."
  $texts = @($batch | ForEach-Object { $_.searchText })
  $bodyObj = @{ model = "text-embedding-3-small"; input = $texts }
  $body = $bodyObj | ConvertTo-Json -Depth 5 -Compress
  $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)

  $response = Invoke-RestMethod -Uri "https://api.openai.com/v1/embeddings" `
    -Method POST `
    -Headers @{ Authorization = "Bearer $apiKey"; "Content-Type" = "application/json; charset=utf-8" } `
    -Body $bodyBytes `
    -TimeoutSec 120

  for ($j = 0; $j -lt $batch.Count; $j++) {
    $embedding = $response.data | Where-Object { $_.index -eq $j } | Select-Object -ExpandProperty embedding
    $results += [PSCustomObject]@{
      id         = $batch[$j].id
      content    = $batch[$j].content
      searchText = $batch[$j].searchText
      metadata   = $batch[$j].metadata
      embedding  = $embedding
    }
  }
  Start-Sleep -Milliseconds 400
}

$outPath = "prisma/embeddings-cache.json"
$json = $results | ConvertTo-Json -Depth 10 -Compress
[System.IO.File]::WriteAllText((Join-Path (Get-Location) $outPath), $json, [System.Text.UTF8Encoding]::new($false))
Write-Host "Saved embeddings -> $outPath"
