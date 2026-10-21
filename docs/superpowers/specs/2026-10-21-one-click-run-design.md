# One-Click Local Run Design

**Date:** 2026-10-21

## Goal

Make Khacha Company launchable with one command or a Linux file-manager double-click, while keeping the existing Python server and avoiding unnecessary runtime dependencies.

## Chosen approach

Add an executable `run.sh` at the repository root. The script changes into the repository directory, prefers `uv run --python 3 server.py` when `uv` is installed, and falls back to `python3 server.py` otherwise. This keeps the project usable on machines that already have Python but do not have uv, while allowing uv to provide a managed Python runtime when available.

Update `server.py` to open the local game URL in the default browser after the server binds. The server remains a simple standard-library HTTP server with its current no-cache headers. Browser opening is best-effort and must not prevent the server from starting if the desktop environment has no graphical browser.

Update `package.json` so `npm start` delegates to `./run.sh`, and update `README.md` to make `./run.sh` the primary launch path while retaining direct Python and Node alternatives.

## Files

- Create `run.sh`: one-click launcher with uv-first and Python fallback behavior.
- Modify `server.py`: best-effort browser open after binding to port 8080.
- Modify `package.json`: route `npm start` through the launcher.
- Modify `README.md`: document the primary one-click flow and fallback commands.

## Error handling

The launcher should fail clearly if neither `uv` nor `python3` exists. The server should continue serving even if browser auto-open fails. Existing port and server errors remain visible in the terminal.

## Verification

- Shell syntax check and executable bit check for `run.sh`.
- Python syntax check for `server.py`.
- Existing `npm test` suite.
- Start the launcher in a subprocess, verify `http://localhost:8080/` responds, then stop it.
- Confirm the working tree diff excludes the pre-existing `graphify-out/` directory.
