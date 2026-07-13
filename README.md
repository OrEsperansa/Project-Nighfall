# NightFall Training API

A fictional FastAPI exercise in which students automate the discovery of a target
computer, inspect it, search for relevant files, create an evidence package, and
verify the downloaded evidence. The API never connects to a real computer.

## API Flow

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/login` | Obtain a bearer token |
| `GET` | `/computers` | List general computer data |
| `GET` | `/computers/{computer_id}` | Inspect one computer in detail |
| `POST` | `/computers/{computer_id}/file-searches` | Search synchronously |
| `POST` | `/computers/{computer_id}/evidence-packages` | Create a ready package |
| `GET` | `/computers/{computer_id}/evidence-packages/{package_id}/download` | Download Base64 data and SHA-256 |

There are no polling, reset, session, collector, or transfer-channel endpoints.

Default exercise credentials:

```text
username: sigitattacker
password: LamaLoKapara
```

## Run Locally

```powershell
python -m pip install -r requirements-dev.txt
$env:TOKEN_SECRET = "replace-this-local-secret"
$env:DATASET_SEED = "nightfall-classroom-seed-v1"
python -m uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs`.

Run tests:

```powershell
python -m pytest
```

## Container Image

```powershell
docker build -t registry.example.com/training/nightfall-api:1.0.0 .
docker push registry.example.com/training/nightfall-api:1.0.0
```

Run one local container:

```powershell
docker run --rm -p 8000:8000 `
  -e TOKEN_SECRET="replace-with-a-long-random-value" `
  -e DATASET_SEED="nightfall-classroom-seed-v1" `
  registry.example.com/training/nightfall-api:1.0.0
```

## Deploy One Pod Per Student

The chart uses `studentCount` as **X**. For every student it creates:

- One Deployment with exactly one pod
- One ClusterIP Service
- One Secret with a unique token-signing key
- One native OpenShift Route with a secret-derived path

Mutable API state lives only in the assigned student pod and is never shared.
The chart uses `route.openshift.io/v1` and does not require an Ingress Controller.
The container supports OpenShift's arbitrary non-root UID assignment and the
restricted security context.

```powershell
helm upgrade --install nightfall .\helm\nightfall `
  --namespace nightfall --create-namespace `
  --set studentCount=30 `
  --set image.repository=registry.example.com/training/nightfall-api `
  --set image.tag=1.0.0 `
  --set route.host=nightfall.apps.example.edu `
  --set auth.tokenSeed="replace-with-a-long-random-secret"
```

Use a values file instead of `--set` for production secrets.

Print the assigned Swagger URLs after deployment:

```powershell
helm get notes nightfall --namespace nightfall
```

Routes look like this:

```text
https://nightfall.example.edu/students/student-1-<secret-suffix>/docs
https://nightfall.example.edu/students/student-2-<secret-suffix>/docs
```

The suffix is stable for the same release name and `auth.tokenSeed`, but cannot be
derived without that seed. Give each student only their assigned URL.

## Exercise Reset and Generated Computers

Created evidence packages are stored only in the memory of that student's pod.
The API exposes no reset operation. An instructor can reset one exercise by
deleting its pod; Kubernetes creates a clean replacement automatically.

Computer data is deterministic and time-based. Every pod uses the same
`dataset.seed` and absolute ten-minute time bucket, so all students see the same
computer data at the same time. The four core computers remain stable. A rolling
window of generated decoys gains one new computer each interval and removes the
oldest generated computer.

Changing `dataset.seed` creates a different unified classroom dataset. Changing
the seed during an active class is not recommended.

## Important Values

| Value | Meaning |
|---|---|
| `studentCount` | Number of isolated student deployments |
| `image.repository` | Container registry repository |
| `image.tag` | Image version |
| `route.host` | Shared OpenShift router hostname |
| `routePrefix` | Base URL path, default `/students` |
| `auth.tokenSeed` | Secret used to derive per-student routes and signing keys |
| `dataset.seed` | Shared seed used to generate identical computer data |
| `dataset.generationIntervalSeconds` | How often a new generated computer appears |
| `dataset.generatedComputerCount` | Size of the rolling generated-computer window |

Do not use the default `auth.tokenSeed` outside local testing.
