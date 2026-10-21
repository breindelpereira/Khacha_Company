# One-Click Local Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Linux-friendly one-click launcher that prefers uv, falls back to Python, opens the game in a browser, and is used by npm start.

**Architecture:** Keep the existing standard-library Python HTTP server as the only runtime server. A root `run.sh` provides the launch policy: resolve its own directory, prefer `uv run --python 3 server.py`, fall back to `python3 server.py`, and fail with an actionable message if neither command exists. Browser opening belongs in `server.py` and is best-effort after the socket binds.

**Tech Stack:** POSIX shell, Python 3 standard library, npm scripts, Node built-in test runner.

---

### Task 1: Add the executable uv-first launcher

**Files:**
- Create: `run.sh`

- [ ] **Step 1: Write the launcher**

Create a POSIX-compatible script with this exact behavior:

```sh
#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$ROOT_DIR"

if command -v uv >/dev/null 2>&1; then
  exec uv run --python 3 server.py
fi

if command -v python3 >/dev/null 2>&1; then
  exec python3 server.py
fi

printf '%s\n' 'Khacha Company needs uv or python3 to run.' >&2
exit 1
```

- [ ] **Step 2: Mark it executable and syntax-check it**

Run:

```bash
chmod +x run.sh
sh -n run.sh
```

Expected: exit code 0, with `run.sh` showing executable permissions in `git diff --summary`.

- [ ] **Step 3: Commit the launcher**

```bash
git add run.sh
git commit -m "feat: add uv-first one-click launcher"
```

### Task 2: Open the game automatically after the server binds

**Files:**
- Modify: `server.py`

- [ ] **Step 1: Add standard-library browser support**

Add `import threading` and `import webbrowser` alongside the existing imports. Define:

```python
URL = f"http://localhost:{PORT}/"


def open_browser() -> None:
    try:
        webbrowser.open(URL)
    except Exception as exc:
        print(f"Could not open a browser automatically: {exc}")
```

- [ ] **Step 2: Open the browser only after binding**

Inside the existing `with socketserver.TCPServer(...) as httpd:` block, keep the active-server message and start the browser opener as a daemon thread before `serve_forever()`:

```python
print(f"Khacha Company HTTP Server active at {URL} (no-cache enabled)")
threading.Thread(target=open_browser, daemon=True).start()
httpd.serve_forever()
```

The exception handling must only cover browser opening. The HTTP server must still start if no graphical browser is available.

- [ ] **Step 3: Check Python syntax**

Run:

```bash
python3 -m py_compile server.py
```

Expected: exit code 0.

- [ ] **Step 4: Commit the server change**

```bash
git add server.py
git commit -m "feat: open game in browser on server startup"
```

### Task 3: Route existing commands and docs through the launcher

**Files:**
- Modify: `package.json:6`
- Modify: `README.md:8-25`

- [ ] **Step 1: Update npm start**

Change the package script from:

```json
"start": "python server.py"
```

to:

```json
"start": "./run.sh"
```

Leave the `serve` and `test` scripts unchanged.

- [ ] **Step 2: Make the launcher the primary README path**

Replace the current launch section with:

```markdown
## 🚦 How to Launch & Play

### One-click launch (recommended)

From a terminal in this directory:

```bash
./run.sh
```

You can also double-click `run.sh` in a Linux file manager configured to run shell files. The launcher prefers `uv` and uses `python3` automatically when uv is unavailable. It starts a local server at `http://localhost:8080/` and opens the game in your default browser.

### Other launch options

```bash
# Same launcher through npm
npm start

# Direct Python fallback
python3 server.py

# Alternative static server
npx serve .
```

> Use an HTTP server for full meme voice playback. The WAV files are fetched from `assets/audio/`, and Three.js still loads from its CDN.
```

- [ ] **Step 3: Validate JSON and inspect the diff**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8')); console.log('package.json: valid')"
git diff --check
```

Expected: valid JSON and no whitespace errors.

- [ ] **Step 4: Commit the command and documentation updates**

```bash
git add package.json README.md
git commit -m "docs: make one-click launcher the primary run path"
```

### Task 4: Verify the complete launch workflow

**Files:**
- Test: `tests/*.test.js`
- Verify: `run.sh`, `server.py`, `package.json`, `README.md`

- [ ] **Step 1: Run the existing test suite**

Run:

```bash
npm test
```

Expected: all existing tests pass.

- [ ] **Step 2: Start the launcher and verify HTTP serving**

Run this non-interactively from the repository root:

```bash
./run.sh > "$HOME/.cache/khacha-company-launch.log" 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
python3 - <<'PY'
from urllib.request import urlopen
response = urlopen("http://localhost:8080/", timeout=5)
assert response.status == 200
assert b"<!DOCTYPE html>" in response.read(512)
print("HTTP launch: valid")
PY
kill "$SERVER_PID"
wait "$SERVER_PID" 2>/dev/null || true
```

Expected: `HTTP launch: valid`; the launcher log contains the active-server message.

- [ ] **Step 3: Run final checks**

Run:

```bash
sh -n run.sh
python3 -m py_compile server.py
node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))"
git diff --check
npm test
```

Expected: all commands exit successfully.

- [ ] **Step 4: Commit any final verification-only fixes**

If verification required no changes, leave the implementation commits intact. If a fix was necessary, run the affected checks again and commit it with a focused message.
