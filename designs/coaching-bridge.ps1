# coaching-bridge.ps1 — Architect ↔ Zuberi Coaching Bridge
# Location: C:\Users\PLUTO\scripts\coaching-bridge\coaching-bridge.ps1
# RTL-069 | Session 23
#
# Polls CEG for architect prompts, sends to Zuberi via OpenClaw REST API,
# captures responses, writes back to CEG. No UI automation required.

param(
    [int]$PollIntervalSeconds = 5,
    [int]$MaxExchanges = 20,
    [int]$MinCooldownSeconds = 10,
    [string]$CegShellUrl = "http://100.100.101.1:3003/command",
    [string]$OpenClawUrl = "http://localhost:18789/v1/chat/completions",
    [string]$GatewayToken = "",  # Pass via argument or env var
    [string]$InboxPath = "/opt/zuberi/data/coaching/inbox",
    [string]$OutboxPath = "/opt/zuberi/data/coaching/outbox",
    [string]$AuditPath = "/opt/zuberi/data/coaching/audit",
    [string]$KillSwitchPath = "/opt/zuberi/data/coaching/STOP"
)

# ── Security: Script hash verification ──────────────────────────────
$ScriptHash = (Get-FileHash -Path $PSCommandPath -Algorithm SHA256).Hash
$HashFile = Join-Path (Split-Path $PSCommandPath) "bridge.sha256"

if (Test-Path $HashFile) {
    $StoredHash = (Get-Content $HashFile -Raw).Trim()
    if ($ScriptHash -ne $StoredHash) {
        Write-Error "SECURITY: Script hash mismatch. Expected: $StoredHash Got: $ScriptHash. Script may have been tampered with. Exiting."
        exit 1
    }
    Write-Host "[OK] Script integrity verified." -ForegroundColor Green
} else {
    # First run — store the hash
    $ScriptHash | Out-File -FilePath $HashFile -NoNewline
    Write-Host "[INIT] Script hash stored at $HashFile" -ForegroundColor Yellow
}

# ── Token from env if not passed ────────────────────────────────────
if (-not $GatewayToken) {
    $GatewayToken = $env:OPENCLAW_GATEWAY_TOKEN
}
if (-not $GatewayToken) {
    Write-Error "No gateway token provided. Pass -GatewayToken or set OPENCLAW_GATEWAY_TOKEN env var."
    exit 1
}

# ── Helper: Execute command on CEG ──────────────────────────────────
function Invoke-CEG {
    param([string]$Command)
    $body = @{ command = $Command } | ConvertTo-Json
    try {
        $result = Invoke-RestMethod -Uri $CegShellUrl -Method POST -Body $body -ContentType "application/json" -TimeoutSec 30
        return $result
    } catch {
        Write-Warning "CEG command failed: $_"
        return $null
    }
}

# ── Helper: Write audit log entry ───────────────────────────────────
function Write-AuditLog {
    param([string]$Action, [string]$Detail)
    $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $entry = "$timestamp | $Action | $Detail"
    $escaped = $entry -replace "'", "'\''"
    Invoke-CEG "echo '$escaped' >> $AuditPath/audit.log" | Out-Null
}

# ── Helper: Check kill switch ───────────────────────────────────────
function Test-KillSwitch {
    $result = Invoke-CEG "test -f $KillSwitchPath && echo YES || echo NO"
    if ($result -and $result.ToString().Trim() -match "YES") {
        return $true
    }
    return $false
}

# ── Helper: Check for prompt in inbox ───────────────────────────────
function Get-InboxPrompt {
    $result = Invoke-CEG "ls $InboxPath/*.md 2>/dev/null | head -1"
    if ($result -and $result.ToString().Trim() -and -not ($result.ToString().Trim() -match "No such file")) {
        $filepath = $result.ToString().Trim()
        if ($filepath) {
            $content = Invoke-CEG "cat '$filepath'"
            if ($content) {
                # Delete after reading
                Invoke-CEG "rm '$filepath'" | Out-Null
                return @{
                    Path = $filepath
                    Content = $content.ToString().Trim()
                }
            }
        }
    }
    return $null
}

# ── Helper: Sanitize prompt (strip injection attempts) ──────────────
function Sanitize-Prompt {
    param([string]$Text)
    # Strip lines that look like system prompt overrides
    $lines = $Text -split "`n" | Where-Object {
        $_ -notmatch "(?i)(you are now|ignore previous|system prompt|forget your instructions|disregard)"
    }
    return ($lines -join "`n").Trim()
}

# ── Helper: Send to Zuberi via OpenClaw REST API ────────────────────
function Send-ToZuberi {
    param([string]$Prompt)

    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $GatewayToken"
    }

    $body = @{
        model = "openclaw:main"
        messages = @(
            @{
                role = "user"
                content = $Prompt
            }
        )
        stream = $false
    } | ConvertTo-Json -Depth 5

    try {
        $response = Invoke-RestMethod -Uri $OpenClawUrl -Method POST -Headers $headers -Body $body -TimeoutSec 300
        if ($response.choices -and $response.choices[0].message) {
            return $response.choices[0].message.content
        }
        Write-Warning "Unexpected response structure: $($response | ConvertTo-Json -Depth 3)"
        return $null
    } catch {
        Write-Warning "OpenClaw API error: $_"
        return $null
    }
}

# ── Helper: Write response to outbox ────────────────────────────────
function Write-Response {
    param([string]$ResponseText, [int]$ExchangeNum)

    $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd-HHmmss")
    $filename = "response_${ExchangeNum}_${timestamp}.md"

    # Encode as base64 to avoid escaping issues
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($ResponseText)
    $b64 = [Convert]::ToBase64String($bytes)

    Invoke-CEG "echo '$b64' | base64 -d > $OutboxPath/$filename" | Out-Null
    return $filename
}

# ── Main Loop ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Coaching Bridge v1.0 — RTL-069       ║" -ForegroundColor Cyan
Write-Host "║     Architect ↔ Zuberi via OpenClaw      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Polling: $InboxPath every ${PollIntervalSeconds}s" -ForegroundColor Gray
Write-Host "Max exchanges: $MaxExchanges" -ForegroundColor Gray
Write-Host "Kill switch: $KillSwitchPath" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

Write-AuditLog "START" "Bridge started. Max=$MaxExchanges, Poll=${PollIntervalSeconds}s"

$exchangeCount = 0
$lastExchangeTime = [datetime]::MinValue
$running = $true

try {
    while ($running) {
        # Kill switch check
        if (Test-KillSwitch) {
            Write-Host "[KILL] Kill switch detected. Shutting down." -ForegroundColor Red
            Write-AuditLog "KILL" "Kill switch file detected"
            break
        }

        # Exchange limit check
        if ($exchangeCount -ge $MaxExchanges) {
            Write-Host "[LIMIT] Max exchanges ($MaxExchanges) reached. Shutting down." -ForegroundColor Yellow
            Write-AuditLog "LIMIT" "Max exchanges reached: $MaxExchanges"
            break
        }

        # Check inbox
        $prompt = Get-InboxPrompt
        if ($prompt) {
            # Cooldown check
            $elapsed = (Get-Date) - $lastExchangeTime
            if ($elapsed.TotalSeconds -lt $MinCooldownSeconds) {
                $wait = $MinCooldownSeconds - [int]$elapsed.TotalSeconds
                Write-Host "[COOL] Cooldown: waiting ${wait}s..." -ForegroundColor Yellow
                Start-Sleep -Seconds $wait
            }

            $exchangeCount++
            $promptText = Sanitize-Prompt $prompt.Content
            $wordCount = ($promptText -split '\s+').Count

            Write-Host ""
            Write-Host "[$exchangeCount/$MaxExchanges] Prompt received ($wordCount words)" -ForegroundColor Cyan
            Write-Host "  First 80 chars: $($promptText.Substring(0, [Math]::Min(80, $promptText.Length)))..." -ForegroundColor Gray
            Write-AuditLog "INJECT" "exchange=$exchangeCount words=$wordCount"

            # Send to Zuberi
            Write-Host "  Sending to Zuberi..." -ForegroundColor Yellow
            $response = Send-ToZuberi $promptText

            if ($response) {
                $responseWords = ($response -split '\s+').Count
                Write-Host "  Response received ($responseWords words)" -ForegroundColor Green

                # Write to outbox
                $filename = Write-Response $response $exchangeCount
                Write-Host "  Written to: $OutboxPath/$filename" -ForegroundColor Green
                Write-AuditLog "CAPTURE" "exchange=$exchangeCount words=$responseWords file=$filename"
            } else {
                Write-Host "  No response from Zuberi." -ForegroundColor Red
                Write-AuditLog "ERROR" "exchange=$exchangeCount no_response"
            }

            $lastExchangeTime = Get-Date
        }

        Start-Sleep -Seconds $PollIntervalSeconds
    }
} finally {
    Write-AuditLog "STOP" "Bridge stopped. Total exchanges: $exchangeCount"
    Write-Host ""
    Write-Host "Bridge stopped. Total exchanges: $exchangeCount" -ForegroundColor Cyan
}
