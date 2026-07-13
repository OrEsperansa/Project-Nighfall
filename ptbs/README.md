# PTBS NightFall Reference Solution

This folder contains the instructor reference implementation for the complete
NightFall exercise. It dynamically discovers every resource identifier and does
not rely on polling or hardcoded computer, file, or package IDs.

## What It Demonstrates

- A reusable `requests.Session`
- Bearer-token authentication
- Dynamic target discovery
- General-list and detailed-resource handling
- Synchronous file search
- Selection of only `HIGH` relevance results
- Evidence-package creation
- Strict Base64 decoding
- Constant-time SHA-256 comparison
- JSON validation and atomic file output
- Clear errors without printing the password or access token

## Run Against the Local API

```powershell
python -m pip install -r .\ptbs\requirements.txt
python .\ptbs\solution.py --base-url http://127.0.0.1:8000
```

## Run Against an OpenShift Student Route

The base URL must include the assigned route path, but not `/docs`:

```powershell
python .\ptbs\solution.py `
  --base-url https://nightfall.apps.example.edu/students/student-1-<route-suffix>
```

The default credentials match the exercise:

```text
username: sigitattacker
password: LamaLoKapara
```

They can be overridden without placing them on the command line:

```powershell
$env:NIGHTFALL_USERNAME = "sigitattacker"
$env:NIGHTFALL_PASSWORD = "LamaLoKapara"
python .\ptbs\solution.py --base-url $env:NIGHTFALL_BASE_URL
```

Successful execution creates `nightfall_evidence.json` only after its SHA-256
checksum and expected NightFall fields have been verified.
