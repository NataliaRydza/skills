# jigx-ux: how to use it

## Install

Install it once with the `skills` CLI, together with the generic `jigx` skill:

```sh
npx skills add jigx-com/skills --skill jigx --skill jigx-ux --agent claude-code --global
```

Use `--agent codex` for Codex, or leave out `--global` to install it only for the
current project.

**Test version** (before it is merged into `jigx-com/skills`), from the branch it is
being built on:

```sh
npx skills add "NataliaRydza/skills#feat/jigx-ux-skill" --skill jigx-ux --agent claude-code --global --yes
```

Run the same command again to get the latest changes from that branch. Update with `npx skills update jigx-ux`. The repo README has the
other install options.

For the icon check, also install the **icon-migration** skill (it needs access to the
private `jigx-com/icon-migration` repo and `gh auth login`):

```sh
# Claude Code
/plugin marketplace add jigx-com/icon-migration
/plugin install icon-migration@jigx-icon-migration
# Codex and other agents
npx skills add jigx-com/icon-migration -g -a codex
```

Without it, everything else works and the icon check tells you how to install it.

## Run it

Open the solution in Claude Code (the folder with `index.jigx`, or the repo that holds
it) and type:

```text
/jigx-ux
```

It runs the UX lint and the icon check, reads the main screens, and writes up what it
finds as numbered proposals for you to approve. It then offers a walkthrough on the
simulator. Add a folder (`/jigx-ux AcumaticaBase`) when the repo holds more than one
solution.

You don't need the command while building: when you ask for a screen or a change
("add a photos screen", "is this form OK?"), the skill loads on its own and applies
the rules.

## The review

1. **Finds the problems.** The lint and the icon check run in a few seconds. Claude
   then reads the main screens against the core rules (`references/ux-guidelines.md`)
   and the domain playbook that fits (field service, time, sales, projects, expenses).
2. **Writes proposals.** Each one says *what's wrong · why change it · the proposed
   fix*, with severity, effort and every place it happens. They are saved to
   `ux-proposals.md` in the solution folder. It never overwrites an existing file,
   because it may hold your approvals.
3. **You approve.** Tick **Approve** under each proposal, or reply with IDs ("approve
   P1, P3-P5").
4. **Only approved items are changed.** Claude reports each one as done, rejected,
   needs a decision, or owner action.

Nothing in your solution changes until you approve it. A change you asked for
directly ("rename this button") is made straight away.

## The device walkthrough (optional)

Many problems only show on a phone: cut-off titles, text that doesn't fit at large
sizes, buttons covering content, pre-filled numbers that append ("1" + "2" = 12). If
a simulator is running, Claude can walk the main flows, take a screenshot of each
screen and add what it finds to the proposals.

- **Claude asks first.** The walkthrough creates real data (starts records, adds
  photos and lines), so use a test user on a test solution.
- You publish the solution and sign in to the Jigx app yourself. Claude can't sign
  in for you.
- It also checks large text (after restarting the app), dark mode and, if you install
  the app there, a small phone (iPhone SE). It sets the text size and appearance back
  afterwards.

## What you need

| To | You need |
| --- | --- |
| The review and proposals | Node 18+ |
| Icon check | the icon-migration skill (above) |
| Device walkthrough (iOS) | macOS with Xcode and a booted iOS Simulator, the Jigx app installed and signed in, and `idb` for taps and typing: `brew install idb-companion` and `pip install fb-idb` |

Android isn't covered by the walkthrough yet.

## Reading the findings

| Severity | Means |
| --- | --- |
| High | Users can lose data, act on the wrong record, or get stuck. Fix before release |
| Medium | Confusing, slow or inconsistent. Fix soon |
| Low | Polish. Fix when you touch the screen |

The lint reads files line by line, so its findings are **prompts to check, not
proof**. Some places may be intentional; the proposal says so. What it looks for:

| Area | Finds |
| --- | --- |
| Screens | missing titles or header images |
| Delete | a swipe that deletes with no "are you sure?", a delete shown with a pencil icon or not in red |
| Sync state | "waiting to sync" coloured as an error |
| Edit flows | the discard warning switched off on a form |
| Words | "Oops", "Something went wrong", OK/Submit/Yes/No as labels, `N/A`, raw errors or JSON shown to users |
| Dates | one-off date formats instead of the shared one |
| Messages | an error shown only in a toast that disappears |
| Actions | more than two bottom buttons, or the three-dots menu (`references/actions-layout.md`) |
| Custom parts | custom components and hand-built layouts to compare with the native look on a device (`references/custom-components.md`) |
| Numbers | a number field with a fixed default that typing appends to |
| Icons | old Streamline names, `-filled` names, unknown names, icons from data that aren't registered |

For a spelling pass, `ux-lint.mjs --strings` lists every text a user can see, with
its file and line.

## Scripts

Claude runs these for you; you can also run them by hand. `$UX` is the skill's
`scripts` folder, for example `~/.claude/skills/jigx-ux/scripts`.

| Script | Does |
| --- | --- |
| `ux-lint.mjs <solution> --text` | the UX lint; `--strings` lists all visible text |
| `check-icons.mjs <solution>` | read-only icon check (`--json`; `--name <icon>` checks single names). Exit 0 clean, 1 needs migration, 2 failure, 3 icon-migration skill not found |
| `propose.mjs <solution>` | writes `ux-proposals.md` from the lint and the icon check (`--out <file>`, `--stdout`, `--json`) |
| `sim.sh` | simulator helper: `shot`, `tap`, `swipe`, `text`, `textsize <size>` (restarts the app), `restart` |

```sh
node $UX/ux-lint.mjs /path/to/solution --text
node $UX/check-icons.mjs /path/to/solution
node $UX/propose.mjs /path/to/solution
```

Tests: `node --test $UX/*.test.mjs`.
