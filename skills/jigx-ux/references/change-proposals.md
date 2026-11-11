# Change Proposals: Propose, Approve, Implement

UX improvements that nobody explicitly asked for are **proposed first**. The solution
owner decides which of them to implement. The agent never changes a solution based
on its own findings until the owner has approved them.

## 1. When this applies

| Situation | Approval needed? |
| --- | --- |
| The owner asks for a specific change ("add a Delete swipe to lines") | No. The request is the approval. Apply the UX rules while implementing it |
| UX review, audit, "improve the UX", release check | **Yes.** Produce proposals, implement only the approved ones |
| While implementing a request, the agent notices other problems | **Yes** for those extras. Do the requested change only, and add the extras as proposals |
| Icon migration found by `check-icons.mjs` | **Yes.** It is one proposal. Once approved, run the icon-migration skill (which has its own review page) |
| Behaviour shared with other customers would change or be removed | **Yes**, always as a separate proposal. Prefer a config flag (core rule 2.2) |
| Data values at the source (Dynamic Data rows, ERP values) | The agent can't change these. Propose them as **owner actions** |

## 2. Draft the proposals

1. Run the draft script from the skill folder against the solution (the folder with
   `index.jigx`):

   ```sh
   node skills/jigx-ux/scripts/propose.mjs /path/to/solution                 # writes <solution>/ux-proposals.md
   node skills/jigx-ux/scripts/propose.mjs /path/to/solution --out review.md # another file
   node skills/jigx-ux/scripts/propose.mjs /path/to/solution --stdout        # print only
   node skills/jigx-ux/scripts/propose.mjs /path/to/solution --json          # machine-readable
   ```

   It combines the UX lint and the icon check into numbered proposals (P1, P2, ...),
   ordered by severity. Findings of the same kind are grouped into one proposal with all
   their places. It refuses to overwrite an existing proposals file, because that file
   may hold the owner's decisions.
2. **Check each proposal before handing it over.** The lint is heuristic. Remove places
   that are intentional (for example a real "N/A" answer option) and adjust the fix
   text to the solution.
3. **Add manual findings** from the journey walkthrough (`ux-review.md` section 3) under
   "Manual findings", in the same format, with the next free IDs.
4. Keep the file out of the published solution. Don't commit it to the solution repo
   unless the owner wants it there.

### What a good proposal contains

```markdown
## P7 [High] Complete fails silently when the signature is missing

- [ ] **Approve**
- **Fix:** List the missing items above Complete with links ("Sign", "Open time logs"); keep Complete disabled with the reason.
- **Rule:** core rules 2.4, 2.5 · domain-field-service.md section 7
- **Effort:** M
- **Source:** manual (walkthrough: complete appointment offline)
- **Status:** proposed
- **Places:**
  - jigs/Appointment/view-appointment.jigx
- **Decision needed:** should Complete stay visible-but-disabled, or open the list of blockers?
```

- **One problem per proposal**, so the owner can approve or reject it on its own. Don't
  bundle unrelated fixes.
- **The fix says what will change**, in words the owner understands. Include the
  proposed message text when the fix changes wording.
- **Severity** follows `ux-review.md`: High covers data loss, a user trapped, or wrong
  information. Medium slows or confuses repeated work. Low is polish.
- **Effort:** S (minutes, local edit), M (several screens or a shared component),
  L (flow change, needs testing on a device).
- **Decision needed:** list any choice the owner must make (wording, which option),
  instead of guessing.
- **Mark customer-specific proposals as such** and keep them out of the generic rules.

## 3. Owner approval

The owner can approve in either of two ways:

- **In the file:** tick `- [x] **Approve**` under each proposal, and optionally add a
  note under it ("use 'Remove' instead of 'Delete'").
- **In chat:** reply with IDs, for example "approve P1, P3-P5; reject P2; P4 except
  jigs/x.jigx; P7 option B".

Read the decisions back before starting: "Implementing P1, P3, P4 (without
jigs/x.jigx), P5. P2 rejected. P6 and P7 not decided." If anything is unclear (a
"Decision needed" without an answer), ask about that proposal only and implement the
rest.

## 4. Implement only what was approved

- Change only the places listed under the approved proposals, in the way the
  proposal describes, plus the owner's notes.
- **If implementing reveals something new**, don't fix it on the side. Add it as a new
  proposal (next ID) and mention it in the report.
- **If a proposal turns out wrong or risky** while implementing it (it breaks a flow,
  or the place is intentional), stop that proposal, set its status to `needs decision`,
  and explain why.
- Approved icon migration: run the icon-migration skill as `icons.md` describes,
  including its review page.
- After implementing, run `ux-lint.mjs` and `check-icons.mjs` again, and run the `jigx`
  runtime checker when YAML changed.

## 5. Report back

Update the **Status** of every proposal in the file, and give a short summary in chat:

| Status | Meaning |
| --- | --- |
| `proposed` | Not decided yet |
| `approved` | Approved, not yet implemented |
| `done` | Implemented. Add the files changed and any check results |
| `rejected` | The owner declined. Keep it in the file so it isn't proposed again |
| `needs decision` | Blocked on an owner choice or a problem found while implementing |
| `owner action` | Something only the owner can do (data at the source, publishing, device check) |

```text
Done: P1 (2 swipes now confirm), P3, P5. P4 done except jigs/x.jigx as asked.
Needs decision: P7 - Complete visible-but-disabled or open blockers list?
New: P9 [Medium] Time entry shows decimal hours on the week view (found while fixing P5).
Rejected: P2. Not verified on device: P1, P5.
```

Say plainly what was not verified on a device. Publishing stays the owner's step
unless they asked the agent to publish.
