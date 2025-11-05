# End of Session Documentation Update

It's time to update our documentation before ending this session. This prompt ensures we maintain a complete and up-to-date record of our work on the DeepCuts music discovery platform.

## Documentation Update Checklist

1. **Update Session History**
   - Add a new entry to `/home/user/music-discovery-graph/docs/SESSION_HISTORY.md` with today's date and session details
   - Include all significant work completed during this session
   - Organize by key components and achievements (Frontend, Backend, Database, Infrastructure, etc.)
   - Use the format: `## Session: [Date] - [Brief Title]`
   - **IMPORTANT: The main history file keeps only the 10 most recent sessions**
   - Place new entries at the top of the file
   - If there are more than 10 entries after adding yours, move the oldest entry to `/home/user/music-discovery-graph/docs/archives/session-history-archive.md`
   - When archiving, place the entry below the "Last archived" date line and update that date

2. **Update Project Status**
   - Refresh `/home/user/music-discovery-graph/docs/PROJECT_STATUS.md` with current implementation status
   - Update "Implementation Status" sections for any features worked on
   - Mark completed items from MVP_ROADMAP.md as ✅
   - Add new "Active Next Steps" based on today's progress
   - Update any blockers or issues discovered

3. **Update Active Tasks**
   - Modify `/home/user/music-discovery-graph/docs/ACTIVE_TASKS.md`
   - Mark completed tasks with ✅ and today's date
   - Add new tasks identified during this session
   - Update priorities based on current development phase
   - Move completed tasks to the "Recently Completed" section

4. **Update Development Notes**
   - If any significant technical decisions were made, add them to `/home/user/music-discovery-graph/docs/DEV_NOTES.md`
   - Document any workarounds, gotchas, or lessons learned
   - Include code snippets or configuration changes for future reference
   - Note any dependencies or breaking changes

5. **Update Main Documentation (if applicable)**
   - Update `/home/user/music-discovery-graph/README.md` if setup instructions changed
   - Update `/home/user/music-discovery-graph/ARCHITECTURE.md` if architectural decisions were made
   - Update `/home/user/music-discovery-graph/MVP_ROADMAP.md` if timeline or scope changed
   - Ensure all examples and commands still work

6. **Check Implementation Progress**
   - Review "Development Status" section in README.md
   - Update checkboxes (✅/⬜) to reflect current completion state
   - Add any new features or components to the list

## Required Documentation Structure

If these files don't exist yet, create them with the following structure:

### `/home/user/music-discovery-graph/docs/SESSION_HISTORY.md`
```markdown
# Session History

This file tracks the 10 most recent development sessions. Older sessions are archived in `archives/session-history-archive.md`.

---

## Session: YYYY-MM-DD - [Brief Title]

### Summary
[One paragraph overview of what was accomplished]

### Components Worked On
- **Frontend**: [Changes]
- **Backend**: [Changes]
- **Database**: [Changes]
- **Infrastructure**: [Changes]
- **Documentation**: [Changes]

### Key Achievements
- [Achievement 1]
- [Achievement 2]

### Issues Encountered
- [Issue and resolution]

### Next Session Focus
- [Priority 1]
- [Priority 2]

# Project Status

Last updated: YYYY-MM-DD

## Current Phase
[MVP Development / Testing / Production / etc.]

## Implementation Status

### Authentication & User Management
- ✅ Supabase Auth integration
- ✅ User profiles
- ⬜ Password reset flow

### Music Discovery Features
- ✅ Spotify track search
- ✅ Drop creation
- ⬜ Discovery circles

[Continue for all major features...]

## Current Blockers
- [None / List blockers]

## Active Next Steps
1. [Next priority]
2. [Second priority]
3. [Third priority]

## Recent Completions
- [Recent item] - YYYY-MM-DD

# Active Tasks

Last updated: YYYY-MM-DD

## High Priority
- [ ] [Task description]
- [ ] [Task description]

## Medium Priority
- [ ] [Task description]

## Low Priority / Future
- [ ] [Task description]

## Recently Completed
- ✅ [Task] - YYYY-MM-DD
- ✅ [Task] - YYYY-MM-DD

# Development Notes

Technical decisions, gotchas, and lessons learned during development.

---

## YYYY-MM-DD - [Topic]

**Context**: [Why this was needed]

**Decision**: [What was implemented]

**Details**:
```bash
# Code or commands

## Summary Format

Provide a concise report of all documentation updates made (no more than 10 lines) covering:

- Which documents were updated
- Key changes made to each document
- Features/components completed or progressed
- Any new tasks or blockers identified
- Current focus for next session

## Important Notes

1. **Paths**: Always use full absolute paths starting with `/home/user/music-discovery-graph/`
2. **History Management**: Only keep the 10 most recent sessions in SESSION_HISTORY.md
3. **Archive**: Move older entries to `docs/archives/session-history-archive.md` (create if needed)
4. **Dates**: All dates should be in YYYY-MM-DD format (use 2025-11-04 for today)
5. **Consistency**: Keep status aligned across PROJECT_STATUS.md, README.md, and MVP_ROADMAP.md
6. **Git Status**: Note any uncommitted changes or branches
7. **PRESERVE ALL HISTORICAL RECORDS - THEY ARE VALUABLE CONTEXT**

## Categories for This Project

When documenting work, organize by these categories:
- **Frontend**: Next.js components, UI/UX, client-side logic
- **Backend**: API routes, server-side logic, integrations
- **Database**: Schema changes, migrations, queries
- **Authentication**: Supabase Auth, user management
- **Music Integration**: Spotify API, track search, platform connections
- **Reputation System**: Trust scores, validation, stakes
- **Infrastructure**: Deployment, environment config, DevOps
- **Documentation**: README, guides, comments
- **Testing**: Unit tests, integration tests, manual testing

## Next Steps Prompt

After completing the documentation update, respond with:

"Documentation has been updated to reflect today's progress. We're ready to continue. In our next session, we should focus on [brief description of next priority based on PROJECT_STATUS.md]."

## Metrics Collection

After using this prompt, record its effectiveness:

**If metrics file exists**: Add entry to `/home/user/music-discovery-graph/docs/metrics/prompt-effectiveness.md`

**If metrics file doesn't exist**: Create it first, then add entry.

### Metrics File Structure (`/home/user/music-discovery-graph/docs/metrics/prompt-effectiveness.md`):

```markdown
# Prompt Effectiveness Metrics

## Summary Statistics

| Metric | Average |
|--------|---------|
| Time Saved per Session | [X] minutes |
| Documentation Quality | [X]/5 |
| Tasks Completed | [X] per session |
| Overall Satisfaction | [X]/5 |

Last updated: YYYY-MM-DD

---

## Detailed Records

**IMPORTANT: Always ADD a NEW entry - NEVER edit existing entries - these are historical records!**

### YYYY-MM-DD - end-of-session

- **Session Focus**: Brief description of what was worked on
- **Documentation Updated**: List of files updated
- **Completion**: ✅ Successful / ⚠️ Partial / ❌ Unsuccessful
- **Time Saved**: Estimated time saved by using structured prompt (in minutes)
- **Quality**: Documentation quality rating (1-5)
- **Errors Prevented**: Description of any errors the prompt helped avoid
- **Satisfaction**: Overall satisfaction (1-5)
- **Notes**: Observations or suggestions for improvement