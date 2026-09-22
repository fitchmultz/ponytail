# Native Pi / Astra evaluation

A small paired evaluation of complete repository tasks. Node.js 22.19+ and Git are
required on macOS/Linux, along with an already installed Pi CLI and working Astra
authentication. There is no provider wrapper, custom tool loop or runtime dependency.

## Run

From the repository root, supply the **exact final extension entry file**, preferably
from a pinned, clean release checkout or unpacked artifact. Relative paths are resolved
and the real path, runtime/policy file hashes and available Git revision are retained. Keep that artifact
and the Pi configuration unchanged throughout the experiment. Do not tune the policy
against the holdout.

```sh
node --test benchmarks/pi/run.test.mjs                 # model-free

node benchmarks/pi/run.mjs \
  --runtime fork --fork /absolute/path/to/fork/pi \
  --extension /absolute/path/to/ponytail/pi-extension/index.js \
  --repetitions 3 --out /tmp/ponytail-astra-fork

node benchmarks/pi/run.mjs \
  --runtime official --official /absolute/path/to/official/pi \
  --extension /absolute/path/to/ponytail/pi-extension/index.js \
  --repetitions 3 --out /tmp/ponytail-astra-official

# Reserve this separate run for the final policy/artifact:
node benchmarks/pi/run.mjs --fork /absolute/path/to/fork/pi \
  --extension /absolute/path/to/ponytail/pi-extension/index.js \
  --tasks holdout-ranges --repetitions 3 --out /tmp/ponytail-astra-holdout
```

Output directories must not exist; their parent must exist. No run is overwritten.
`--tasks` and `--arms` accept comma-separated selections. Default tasks are
`scope-cache,reuse-money,shared-default`; default arms are `baseline,ponytail`.
Other options: `--mode lite|full|ultra` (default ultra),
`--provider openai-codex|openai` (default openai-codex), and `--timeout-ms` (default
600000 per cell; maximum 2147483647). Astra and max reasoning are fixed in both arms.
The observed context window must be 600000; the runner rejects other values without
changing your configuration. Runs are sequential:
for each task/repetition the arms are adjacent, and the starting arm alternates across
repetitions and tasks. Different CLI distributions are separate experiments.

The runner preserves native credentials and model configuration, including context
window overrides. It does not write global settings or copy credential stores. Native
Pi may renew its own authentication as usual. Both arms use the same native
`read,write,edit,bash` tools. Discovery of other extensions, skills, context files,
templates and themes is disabled; project settings are untrusted. Native custom
`SYSTEM.md`/`APPEND_SYSTEM.md` remain in effect and their fingerprints are recorded.
Check captured prompts for contamination before drawing conclusions.

Baseline means **no Ponytail**. Both arms load the same small read-only observer,
last. It records selected runtime fields and the serialized Responses request's
instructions/system messages at `before_provider_request`, after full-prompt replacement.
It does not return a replacement, register tools, or read headers/auth. The official
runtime may omit the effective compaction-settings getter; that field stays null.

## Tasks and independent checks

| Fixture | Required behavior |
| --- | --- |
| `scope-cache` | Finish both TTL memoization and catalog integration; identity, falsy results, expiry, exceptions and per-instance ownership |
| `reuse-money` | Extend receipt display using shared money behavior without narrowing existing invoice/locale/currency/error behavior |
| `shared-default` | Repair the shared nullish-default contract, including sibling and future callers, rather than patch one symptom |
| `holdout-ranges` | Complete range union and duration; validation, ordering, overlap and input ownership |

Every cell starts from a fresh committed Git repository. Original tests are held by
the parent runner, then written outside the agent working directory for grading.
The independent check process never executes an agent-supplied replacement. The complete
original test bytes must remain an unchanged prefix of `test.mjs`; append-only coverage
is allowed. A separate process also runs the workspace's `test.mjs`, and both processes
must pass. Review appended content for interference with existing checks; a prefix match
alone cannot establish that. Changed/deleted original bytes fail integrity checks even
if behavioral checks pass. The holdout's extra checks are never copied into the working
repository. They are published here for auditability,
not a secret or sandbox boundary: native Bash still has ordinary host access.

Checks execute observable behavior, never reward line counts or demand a particular
code shape. Review the final diff for actual reuse and unnecessary complexity; behavior
checks cannot prove maintainability. Model-free tests establish that originals fail,
complete reference implementations pass, tampered tests do not bypass grading, and a
smoke-example-only holdout implementation fails the independent checks.

## Evidence and interpretation

`manifest.json` retains the schedule, exact CLI/artifact paths and hashes, revisions,
config fingerprints and requested settings. Each cell retains its prompt, original Git
revision, independent check sources/output before and after, exact command, JSON events,
request/system-prompt observations, stderr, wall time, final workspace, Git status,
full tracked/untracked diff, and result. `results.json` is updated after every cell,
including failures. SIGINT/SIGTERM stop the active process group, retain that cell as a
failure and stop scheduling new cells. Keep artifacts private; raw prompts, tool events and native errors
can contain local information. Review before publishing.

A successful cell requires final assistant `stop`, a successful process exit, valid
JSON events, preserved original tests and passing independent and workspace checks,
plus observed Astra/max/tools consistency. Assistant errors (including those followed by a retry), deadlines,
extension errors, missing observer records and configuration/artifact changes fail. Exit zero alone never passes.

If a grader defect requires reclassification, keep raw results untouched and produce
separate versioned receipts for every arm and host, including original/corrected verdicts,
input hashes, executed checks and manual review evidence. Preserve unrelated failures.

Compare efficiency only for complete, runtime-matched pairs, while reporting failure
rates for **all** scheduled cells. An interrupted harness can leave cells unrun; compare
`planned` against `results` and do not silently discard them.

Native `input`, `cacheRead`, `cacheWrite` and `output` are disjoint. Reasoning tokens
are a subset of output and are reported separately, never added to the total.
Only authoritative `message_end` assistant usage is counted; streaming snapshots and
turn summaries are not counted again. Unknown/failed/compacted usage totals, known recovered transport attempts, and runs
with auxiliary usage entries such as cache warming are null;
reported subtotals remain available and must not be treated as complete or free work.
Native cost is an estimate, not subscription billing or demonstrated savings. Timing
diagnostics remain an empty list when unavailable; process wall time is always recorded.
Cache state, host load and ordering can still affect repeated trials. These small
fixtures do not establish general model superiority or broad performance savings.
