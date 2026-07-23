# Call OpenAI chat completions (works when Node.js DNS fails on Windows)
param([string]$PayloadPath)

$ErrorActionPreference = "Stop"

Get-Content (Join-Path $PSScriptRoot "..\.env") | ForEach-Object {
  if ($_ -match '^\s*OPENAI_API_KEY=(.+)$') {
    $env:OPENAI_API_KEY = $matches[1].Trim().Trim('"')
  }
}

if (-not $env:OPENAI_API_KEY) { Write-Error "OPENAI_API_KEY missing" }

$payload = Get-Content $PayloadPath -Raw -Encoding UTF8
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($payload)

# IMPORTANT (Arabic mojibake fix):
# Windows PowerShell 5.1 Invoke-RestMethod/Invoke-WebRequest decode the response
# body as ISO-8859-1 (Latin-1) when the server omits an explicit charset, which
# corrupts UTF-8 Arabic (e.g. "عطر" becomes "Ø¹Ø·Ø±"). We therefore read the RAW
# response bytes and decode them as UTF-8 ourselves before parsing the JSON.
$response = Invoke-WebRequest -Uri "https://api.openai.com/v1/chat/completions" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $env:OPENAI_API_KEY"; "Content-Type" = "application/json; charset=utf-8" } `
  -Body $bodyBytes `
  -TimeoutSec 90 `
  -UseBasicParsing

$respBytes = $response.RawContentStream.ToArray()
$json = [System.Text.Encoding]::UTF8.GetString($respBytes)
$parsed = $json | ConvertFrom-Json
$content = $parsed.choices[0].message.content

# Ensure UTF-8 on stdout (avoids Here???s instead of Here's on Windows)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$utf8 = New-Object System.Text.UTF8Encoding $false
[Console]::OpenStandardOutput().Write($utf8.GetBytes($content), 0, $utf8.GetByteCount($content))
