param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$Email,
    [string]$Name = "Demo User",
    [switch]$SkipAuth
)

$ErrorActionPreference = "Stop"

$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
    param(
        [string]$Step,
        [string]$Status,
        [string]$Details
    )

    $results.Add([PSCustomObject]@{
        Step    = $Step
        Status  = $Status
        Details = $Details
    })
}

function Invoke-Step {
    param(
        [string]$Step,
        [scriptblock]$Action
    )

    try {
        $value = & $Action
        Add-Result -Step $Step -Status "PASS" -Details "OK"
        return @{ Success = $true; Value = $value }
    }
    catch {
        $msg = $_.Exception.Message
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
            $msg = "{0} | Response: {1}" -f $msg, $_.ErrorDetails.Message
        }
        Add-Result -Step $Step -Status "FAIL" -Details $msg
        return @{ Success = $false; Value = $null }
    }
}

Write-Host "Running backend demo against $BaseUrl" -ForegroundColor Cyan

$health = Invoke-Step -Step "Health Check GET /" -Action {
    Invoke-RestMethod -Method Get -Uri "$BaseUrl/"
}

if (-not $health.Success) {
    Write-Host "Backend is not reachable. Stopping demo." -ForegroundColor Red
    $results | Format-Table -AutoSize
    exit 1
}

$accessToken = $null

if (-not $SkipAuth -and [string]::IsNullOrWhiteSpace($Email)) {
    $Email = Read-Host "Enter demo email for OTP/login (or press Enter to skip auth demo)"
}

if (-not $SkipAuth -and -not [string]::IsNullOrWhiteSpace($Email)) {
    $otpSend = Invoke-Step -Step "Send OTP POST /auth/otp" -Action {
        $body = @{ email = $Email } | ConvertTo-Json
        Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/otp" -ContentType "application/json" -Body $body
    }

    if ($otpSend.Success) {
        $otpCode = Read-Host "Enter OTP sent to $Email"
        if (-not [string]::IsNullOrWhiteSpace($otpCode)) {
            $login = Invoke-Step -Step "Login POST /auth/login" -Action {
                $body = @{ name = $Name; email = $Email; otp = $otpCode } | ConvertTo-Json
                Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType "application/json" -Body $body
            }

            if ($login.Success -and $login.Value.access_token) {
                $accessToken = $login.Value.access_token
            }
            else {
                Add-Result -Step "Extract Access Token" -Status "FAIL" -Details "No access_token found in login response"
            }
        }
        else {
            Add-Result -Step "Login POST /auth/login" -Status "FAIL" -Details "OTP input was empty"
        }
    }
}
else {
    if ($SkipAuth) {
        Add-Result -Step "Auth Flow" -Status "SKIP" -Details "Skipped by flag"
    }
    else {
        Add-Result -Step "Auth Flow" -Status "SKIP" -Details "No email provided"
    }
}

if (-not [string]::IsNullOrWhiteSpace($accessToken)) {
    $headers = @{ Authorization = "Bearer $accessToken" }

    Invoke-Step -Step "Get Profile GET /api/users/me" -Action {
        Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/users/me" -Headers $headers
    } | Out-Null

    Invoke-Step -Step "List Files GET /api/files/" -Action {
        Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/files/" -Headers $headers
    } | Out-Null
}
else {
    Add-Result -Step "Protected Routes" -Status "SKIP" -Details "No access token"
}

Write-Host ""
Write-Host "Demo summary" -ForegroundColor Cyan
$results | Format-Table -AutoSize

$failed = $results | Where-Object { $_.Status -eq "FAIL" }
if ($failed.Count -gt 0) {
    exit 1
}

exit 0
