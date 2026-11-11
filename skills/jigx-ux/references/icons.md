# Icons: Current Names, Checking And Migration

Jigx app icons have moved from the Streamline set to the **Tabler Icons outline set**
(Tabler 3.49.0 at the time of writing). Screens open faster and use less memory, and
every icon comes from one family. Old Streamline names still render, but a name that
exists in both sets now shows the Tabler drawing, which can change the meaning.

## 1. Rules for every new or changed icon

- **Use Tabler outline names only.** Never use names ending in `-filled`, because the
  app ships only the outline set and a filled name shows a red question mark.
- **Check a name before using it:**
  `node skills/jigx-ux/scripts/check-icons.mjs --name <icon> [<icon> ...]`.
  You can also use the icon-migration skill's `find.mjs <word>` or browse
  https://tabler.io/icons.
- **Navigation uses `chevron-right`, not `arrow-right`.** In Streamline, `arrow-right`
  drew a chevron. In Tabler it is a full arrow. Check other shared names the same way
  (the name check reports them).
- **Some names are never renamed:** country flags (`us`, `gb`, ...), `start-marker`,
  `end-marker`, `jigx-solid`, and the placeholder animations (`loading-data`,
  `missing-data`, `is-offline`, `scan-qr`, `helicopter`, `oil-drop`).
- **One icon, one meaning** across the app (core rule 1.11). Delete is `trash`, a
  warning is `alert-triangle`, offline is `wifi-off`, uploading is `cloud-up`, and a
  row link is `chevron-right`.
- **Register icons that come from data** (Dynamic Data tables, static datasources,
  expressions that build the name) in `assets/icons.jigx`, and store Tabler names at the
  data source (core rule 1.3).

## 2. Check a solution

Run the read-only check against the solution folder (the folder with `index.jigx`):

```sh
node skills/jigx-ux/scripts/check-icons.mjs /path/to/solution
node skills/jigx-ux/scripts/check-icons.mjs /path/to/solution --json
```

It reuses the installed **icon-migration** skill (its scanner and the bundled Tabler and
Streamline lists), so both tools always agree. It writes nothing. Exit codes:

| Exit | Status | Meaning |
| --- | --- | --- |
| 0 | `ok` | Every icon in the solution files is a current Tabler outline name |
| 0 | `migration-in-progress` | Names are current, but a `.icon-migration` folder exists. Finish and delete it before publishing |
| 1 | `needs-migration` | Old Streamline names, or unknown names, in icon positions (listed with file:line and the suggested Tabler name) |
| 2 | failure | Not a solution folder, or the check could not run |
| 3 | `tool-missing` | The icon-migration skill is not installed. The output includes install steps |

The report also counts **icons from data** (table reads and computed values). The
migration can't change those values, so they must be checked at the source.

The check looks for the skill in the Claude Code plugin cache, `~/.claude/skills`,
`~/.codex/skills`, `~/.agents/skills` and the project's `.claude/skills` or
`.agents/skills`. Use `--icon-skill <path>` or `JIGX_ICON_MIGRATION_SKILL` to point it
elsewhere.

## 3. What the agent does with the result

1. **`ok`:** nothing to do. Keep new icons on Tabler names (section 1).
2. **`needs-migration` and the icon-migration skill is available to the agent** (for
   example `/icon-migration` in Claude Code, or the installed skill in Codex):
   - Tell the user what was found (number of old names and uses, and the unknown names)
     and suggest committing first.
   - In a review, the migration is one proposal (`change-proposals.md`). With the
     owner's approval, or when the request itself was to migrate icons, run the icon-migration skill on that **one** solution and
     follow its own workflow (scan, decisions, apply, verify, review page). Don't rename
     icons by hand outside that workflow, because hand edits make its apply step refuse
     and break undo.
   - Relay its review page and its `notMigrated` / `fromData` lists to the user.
   - Re-run `check-icons.mjs` afterwards. It should report `ok` or
     `migration-in-progress`.
3. **`needs-migration` but the agent can't run the migration** (skill not loaded in this
   agent, no permission, no Node 18+, a review the user must do themselves): don't
   attempt a partial manual rename. Give the user the steps in section 4 together with
   the findings.
4. **`tool-missing`:** give the user the install steps from section 4, then the
   migration steps. Without the tool, a new icon can still be checked by eye at
   https://tabler.io/icons, but don't claim the solution was checked.
5. **Inside a UX change that doesn't ask for migration:** use Tabler names for anything
   you add or touch. Report the old names elsewhere in the solution as a finding, and
   leave them to a deliberate migration.

## 4. Steps for the user

**Install once** (needs Node.js 18+, access to the private `jigx-com/icon-migration`
repo, and `gh auth login`):

```text
Claude Code:   /plugin marketplace add jigx-com/icon-migration
               /plugin install icon-migration@jigx-icon-migration
Codex/others:  npx skills add jigx-com/icon-migration -g -a codex
```

**Migrate each solution, one at a time:**

1. Commit or back up the solution. (The migration can also be undone: ask the agent to
   revert the icon migration before you delete its working folder.)
2. Open the solution folder and run `/icon-migration` in Claude Code, or ask your agent
   to "migrate the icons in this solution".
3. The agent renames the icons and opens a review page. Change any pick you don't like,
   press **Copy changes for the agent**, and paste the result back into the chat.
4. Update icon names that come from data (Dynamic Data tables, REST or other external
   sources) at the source. The agent lists them but can't change them.
5. When you're happy, delete the `.icon-migration` folder (never publish it), publish
   the solution, and check the icons in the app. A red question mark means a name
   Tabler doesn't have.

Publishing a migrated solution is safe for users on older app versions, because the
full Tabler outline set is served to them too. Shared names such as `arrow-right` are
handled by the migration's reference mapping, so they keep their original look.
