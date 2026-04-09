# Quantified Self consult-brief launch copy

## Main post
Built a small local CLI called Aveil that turns an Apple Health export into an appointment-ready consult brief.

You export your Apple Health data, run `npx aveil-health brief export.zip`, and it generates a self-contained HTML summary you can bring to a clinician or coach. If you only care about sleep and recovery, `npx aveil-health sleep-brief export.zip` generates a narrower version.

The wedge is simple: no account, no server, no dashboard setup. Just Apple Health export in, consult brief out.

The brief is anomaly-first instead of score-first, so it starts with the strongest issue, why it matters, what to ask, and what to test next. It is meant to help a visit start with the clearest signal instead of spending the first ten minutes hunting through raw metrics.

If you test this, I would especially like to know whether the generic `brief` or the narrower `sleep-brief` feels more useful in a real consult.

## Short variant 1
Aveil is a local Apple Health CLI that outputs an appointment-ready consult brief.

Run `npx aveil-health brief export.zip` for a general brief or `npx aveil-health sleep-brief export.zip` for a narrower sleep/recovery version. No account, no server, just export in and HTML brief out.

## Short variant 2
I made a tiny tool that turns an Apple Health export into a consult brief instead of another dashboard.

`brief` gives a general anomaly-first summary, `sleep-brief` gives a narrower sleep/recovery artifact. Everything runs locally, with no account or backend.

## Likely replies
- **What data does it use?** Apple Health export only. You export from the Health app, then run the CLI locally on the zip or XML.
- **Is this another hosted dashboard?** No. There is no account or server flow. It reads your Apple Health export locally and writes an HTML brief.
- **Why both `brief` and `sleep-brief`?** `brief` is the broader consult artifact, while `sleep-brief` is narrower when sleep and recovery are the main topic.

## Direct feedback question
If you were taking one artifact into a real clinician or coach visit, would you prefer the broad `brief` or the narrower `sleep-brief`, and why?
