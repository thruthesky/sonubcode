# Sonub Code

Sonub Code is the vibe-coding agent of [SONUB](https://sonub.com). It runs in the SONUB cloud sandbox and in your terminal,
and uses free open models served by SONUB.

> **Sonub Code is based on [OpenCode](https://github.com/anomalyco/opencode) (MIT License). It is not built by the OpenCode
> team and is not affiliated with them in any way.** See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).

## Branches

- `sonub` — Sonub Code (this README). All SONUB changes live here.
- `dev` — follows upstream OpenCode. Update with `git fetch upstream && git merge upstream/dev` on `dev`, then merge `dev` into `sonub`.

## What is changed from OpenCode

Only what users see — internal package names (`@opencode/*`) and `OPENCODE_*` environment variables are kept so upstream merges stay easy.

| What | Where |
| --- | --- |
| Command name `sonubcode`, User-Agent `sonubcode/…` | `packages/cli/script/build.ts` |
| Data folders `~/.config/sonubcode`, `~/.local/share/sonubcode` | `packages/util/src/global.ts` |
| Project config `sonubcode.json` · `.sonubcode/` | `packages/core/src/config/discovery.ts` |
| Brand text in the TUI/CLI ("Sonub Code") | `script/sonub/rebrand.py` (run again after each upstream merge) |
| Logo | `packages/tui/src/logo.ts` |
| System prompt (Sonub Code · Lyen · safety) | `packages/core/src/session/runner/prompt/system.txt` |
| No update checks against opencode.ai | `packages/cli/src/services/updater.ts` |
| No model catalog download unless `SONUBCODE_MODELS_FETCH=1` | `packages/cli/src/server-process.ts` |
| OpenCode free models off unless `OPENCODE_DISABLE_FREE_MODELS=0` | `packages/core/src/model.ts` · `packages/core/src/plugin/provider/opencode.ts` |

## Build

```bash
bun install                                              # bun 1.4.4 (package.json packageManager)
cd packages/cli && bun run script/build.ts --single --skip-web-ui   # → dist/cli-<os>-<arch>/bin/sonubcode
```

The original OpenCode README is kept as [README.opencode.md](README.opencode.md).
