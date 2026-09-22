---
name: ponytail-gain
description: >
  Show Ponytail's historical agentic benchmark scoreboard with its limits. One-shot display, not a
  persistent mode, and not a per-repo number. Trigger: /ponytail-gain,
  "ponytail gain", "what does ponytail save", "show ponytail impact",
  "ponytail scoreboard".
---

# Ponytail Gain

Display this scoreboard when invoked. One-shot: do NOT change mode, write flag
files, or persist anything.

Figures are historical published **agentic** benchmark results (Haiku 4.5,
n=4, 12 feature tasks on a real FastAPI + React repo). They do not establish
results for GPT-6 Astra, other models, current policy revisions, or this repo.
Source: `benchmarks/results/2026-06-18-agentic.md`.

## Scoreboard

| metric | vs no-skill |
|--------|------------:|
| LOC    | **-54%** |
| tokens | **-22%** |
| cost   | **-20%** |
| time   | **-27%** |
| benchmark safety checks passed | **100%** |

This repo: `/ponytail-debt` (shortcuts you deferred), `/ponytail-audit` (still cuttable).

## Honesty boundary

The safety row is the benchmark's check result, not a general safety guarantee.
These numbers are that historical benchmark only. NEVER print a per-repo savings
figure ("you saved X lines/tokens here"): the unbuilt version was never
written, so there is no live baseline. Real per-repo figures come from
`/ponytail-debt` (a counted ledger); this card points there instead of inventing one.

## Boundaries

One-shot display. Edits nothing, changes no mode.
"stop ponytail" or "normal mode": revert.
