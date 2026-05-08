# Agent Run Receipt Template

Use this after Allen/Aveil implementation or review work when the result needs human trust without rereading the full thread.

## Receipt

- **Objective:** What decision or shipped outcome this run was meant to produce.
- **Repo / path:** Repository name plus the exact local path or worktree used.
- **Branch / commit:** Branch name, final commit SHA, and whether it was pushed, merged, deployed, or left for review.
- **Commands / tests run:** Exact commands, with pass/fail result and any relevant environment notes.
- **Proof artifacts:** Screenshots, logs, APK/AAB/IPA paths, report JSON, deployment IDs, or live endpoint checks.
- **Acceptance gate:** The concrete condition that makes the run acceptable from Alex's point of view.
- **Unresolved risks:** Anything not proven, any stale branch risk, any manual/device/browser verification still needed.
- **Human signoff state:** `not requested`, `requested`, `approved`, `rejected`, or `blocked`, plus who/where if known.

## Minimum quality bar

A receipt is not a status update. It should let Ash or Alex answer: what changed, what proves it, what still needs judgment, and whether the next person can safely merge/publish without reconstructing the run.
