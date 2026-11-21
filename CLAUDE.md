# CLAUDE.md — Voltix (handoff notes for Claude Code)

## What this is
**Voltix** is a VS Code coding-agent extension built for the **Techfest 2026–27 TrueFoundry Forge-a-thon**.
The agent loop runs on **TrueForge** (TrueFoundry's agent runtime); the extension exposes the workspace to it
through an MCP server and keeps the human in control with hunk-level review.

- Repo: https://github.com/aadyasingh1/Trueforge (branch `main`)
- **Deadline: 22 Nov 2026, 23:59 IST** (extended from 20 Nov)
- Owner is a beginner: give **one step at a time**, exact clicks/commands and what success looks like.

### Naming rule (important)
- **Voltix** = our product (extension name, command ids `voltix.*`, settings `voltix.*`, UI text).
- **TrueForge** = the TrueFoundry platform we run on. Never rename platform references:
  `@truefoundry/trueforge-sdk` imports/types, `npx @truefoundry/trueforge`, "runs on TrueForge", "TrueForge session/web UI".
- The GitHub repo is still called `Trueforge`; that's fine.

## Architecture
```
VS Code extension (extension/)                    TrueForge server (localhost:8790)
 ├─ ui/agentPanel.ts      webview panel (HTML+CSS+JS in one template string)
 ├─ commands/agentMode.ts sessions, model fallback chain, verify loop, passport
 ├─ commands/inlineEdit.ts  Ctrl+Cmd+E inline edit (uses edit_file + diff view)
 ├─ agent/session.ts      builds the agent spec from ../agent-definition.json
 ├─ agent/streamProcessor.ts  consumes the TrueForge turn stream -> panel messages
 ├─ tools/mcpServer.ts    MCP server on http://127.0.0.1:7891/mcp (connector "vscode-workspace")
 │     tools: list_workspace_files, read_file (line ranges, ~20k-char chunks),
 │            search_workspace (plain or regex), edit_file (exact search/replace),
 │            propose_file_change (NEW files only), run_command, verify_changes
 ├─ review/*              pending changes, hunk parsing, apply with SHA-256 conflict check, undo stack,
 │                        passport.ts (Change Passport risk report)
 ├─ verify/sandbox.ts     verify-before-apply: copy workspace to a temp dir, write pending files, run tests
 ├─ verify/verifier.ts    chooses the test command, caches result by fingerprint of pending files
 └─ config/settings.ts    voltix.* settings
shared/types.ts           message types between extension and webview
agent-definition.json     agent spec (model, instructions, MCP server, iteration_limit 60)
```
Nothing is written to the user's files until they accept and click **Apply Accepted**.

### Hard-won rules (do not regress)
- `mcpServer.ts`: stateless MCP needs a **new McpServer + transport per HTTP request** (reusing one gives HTTP 500 on the second request). A teammate reverted this once.
- TrueForge rejects tool responses over **24,000 characters** → `read_file` returns chunks with a "call again with start_line=N" footer.
- `propose_file_change` must refuse existing files (an agent once rewrote CHANGES.rst and deleted 1,634 lines). Existing files change only through `edit_file`.
- `read_file` returns the **pending** content so the agent can check its own edits.
- `require_approval_for_tools` is `[]` (approval in TrueForge blocked the loop); the panel review is the gate.
- The extension must **never call model providers directly**; everything goes through TrueForge.
- **Never commit API keys.** Ship examples only (`config/models.example.json`, `.env.example`).
- Webview script lives inside a TS template literal: no backticks or `${` in it, and no `\n` inside JS strings.

## Running it (owner's Mac)
1. TrueForge server: `OUTBOUND_URL_ALLOWED_HOSTS='["127.0.0.1"]' npx @truefoundry/trueforge` (port 8790; data in `~/Library/Application Support/trueforge/db`).
2. Open this repo in VS Code, press **F5** ("Run Voltix Extension") → Extension Development Host. Restart with Shift+Cmd+F5 (full F5 restart after renames).
3. Demo project: `~/Desktop/flask-demo` = pallets/flask tag **3.1.3** with `.venv` (`pytest<9` — pytest 9 breaks Flask 3.1.3 tests).
   Reset: `git checkout -f 3.1.3 && git clean -fd tests docs`.
4. Build/test: `cd extension && npm run compile && npm test`.

### Models (configured in the TrueForge web UI, Settings → Models)
- `openrouter`: `qwen3-coder` (`qwen/qwen3-coder`, paid, ~$0.10–0.30 per Task B run), `gemma-4-26b-paid` (`google/gemma-4-26b-a4b-it`), free `gemma-4-26b`, `nemotron-3-ultra`.
- `gemini` (Google AI Studio free key): `gemma-4-26b-a-4b-it`, `gemma-4-31b-it`, `gemini-3-8-flash` (Gemini 3 fails with tool calls: thought-signature 400).
- `openrouter-broken`: deliberately invalid key, for Task C.
- TrueForge rewrites model names (dots → dashes); settings must use the name it shows.

VS Code user settings:
```json
"voltix.model": "openrouter/qwen3-coder",
"voltix.fallbackModels": ["openrouter/gemma-4-26b-paid"],
"voltix.contextTokenBudget": 3000
```
Task C: `"voltix.model": "openrouter-broken/gemma-4-26b", "voltix.fallbackModels": []`.

## The three judged tasks (on Flask 3.1.3)
- **A — inline edit** on `get_debug_flag` (`src/flask/helpers.py`): "Treat the values 'off' and 'n' as false as well, case-insensitively, and update the docstring to list every value that is treated as false."
  Verify: `FLASK_DEBUG=off python -c "from flask.helpers import get_debug_flag; print(get_debug_flag())"` → `False`.
- **B — agent mode**: "Add a new built-in CLI command flask config that prints the loaded application's configuration as JSON, masking the values of any key containing SECRET, PASSWORD, TOKEN or KEY as "***". It must appear in flask --help, be covered by a test, and be documented alongside the other built-in commands."
  Verify: `git diff --stat && pytest tests/test_cli.py -q` (≥3 files, all pass) and
  `(cd /tmp && flask --app hello --help | grep config && flask --app hello config)` with `/tmp/hello.py` setting `SECRET_KEY` and `API_TOKEN`.
  Known model mistake: tests expecting `TEST_KEY` to be visible (it contains KEY, so it is masked). Verify-before-apply now catches and fixes this automatically.
  Show the live TrueForge session (web UI → Sessions) during Task B.
- **C — failure**: broken key/endpoint, repeat Task A → clear error, editor responsive, `git status` clean.

## Status (21 Nov 2026)
Done and pushed: rename to Voltix; chunked reads, regex search, no-approval loop, tool-name fix, pending-aware read_file, whole-file-rewrite guard.
Delivered as `voltix-verify-update.zip` (check whether it is applied: does `extension/src/verify/` exist?):
- **Verify-before-apply** (`verify_changes` MCP tool + automatic loop after each turn, `voltix.verify.*` settings, max 2 fix rounds)
- **Change Passport** (risk flags, blast radius, "Copy as Markdown")
- **Model badge** (shows fallback) and the native-theme panel restyle

## Still to do before the deadline
1. Apply/verify the zip update, F5, run Task B once and confirm the Verify card and Passport appear. In the TrueForge web UI the `vscode-workspace` connector should list 7 tools.
2. Re-record the demo (≤ 4 min, three clips joined in QuickTime, YouTube unlisted). Narrate: "Voltix, a VS Code coding agent that runs on TrueForge"; point out the automatic verify-and-fix and the passport.
3. Write-up PDF (1–3 pages), headings in order: Team, Starting point, Architecture on TrueForge, How context is selected, Model setup, Scorecard, Tools used, Known limitations. Add "Problems we hit and fixed".
4. README: screenshot of the new panel, setup steps, `voltix.*` settings.
5. Check no key is committed: `git log -p | grep -iE "sk-or|AIza" | head` → nothing. Repo public. Submit the form with the Team ID.
6. OpenRouter credit refund (unused $5) was due by 2:30 PM on 21 Nov.

## Owner's preferences
- For code changes: give **only the changed files, as full files** (no full-repo zip). The owner reviews, then replaces files.
- Don't spend time running tests for them; testing is on the owner (a compile check is fine).
- Copilot is often used to apply changes: give a single copy-paste command chain.
