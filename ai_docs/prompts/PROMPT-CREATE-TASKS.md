# Universal Prompt: Beads Task Agent - Dependency Analysis & Workflow Planning

**Purpose**: Analyze beads tasks and dependencies, create optimized workflow plan with TASKS.md checklist
**Use when**: Starting a new project, planning work phase, or reorganizing task priorities
**Expected outcome**: TASKS.md file at project root with actionable checklist and workflow phases

---

## 📋 Copy This Prompt

```
Use beads task agent to analyze all beads tasks and their dependencies, then create an optimized workflow plan with a TASKS.md checklist.

## Tasks to do:

### 1. Analyze the dependency graph:

**Get full project state:**
- List all open issues and their status (pending/in_progress/completed)
- Map all dependencies and blocking relationships
- Identify critical path items (sequential dependencies)
- Identify parallelizable tasks (no blockers)
- Group tasks by priority (P0/P1/P2)

**Analyze current structure:**
- Are dependencies logical? (no unnecessary blockers)
- Are parallel opportunities maximized?
- Are critical path items minimal?
- Are priorities assigned correctly?

### 2. Create optimized workflow plan:

**Phase breakdown:**
- Group tasks by logical phases (Setup, Core, Integration, Testing, Deployment, etc.)
- Each phase should have clear entry/exit criteria
- Identify which tasks can be done in parallel within each phase
- Estimate time for each phase (based on task count and complexity)
- Show critical path items vs parallel work per phase

**Phase structure:**
```

Phase N: [Phase Name] (Estimated Days X-Y)
Critical Path: task1 → task2 → task3
Parallel Opportunities: - taskA, taskB, taskC (no blockers between them)
Dependencies: - Blocks: [tasks that wait for this phase] - Blocked by: [tasks this phase needs]

````

### 3. Create TASKS.md checklist:

**Location:** Add to project root: TASKS.md

**Include:**

#### Header Section:
```markdown
# TASKS.md

**Project:** [Project Name]
**Last Updated:** [Date]
**Total Open Issues:** [Count]
**Total Phases:** [Count]

**Purpose:** Actionable workflow plan with dependency analysis and parallel execution opportunities
````

#### Phase Breakdown Section:

```markdown
## 🚀 Optimized Workflow Phases

### Phase 0: [Phase Name] (Estimated Days X-Y)

**Ready NOW:** X tasks

**Parallel Tracks:**

- Track A: task1, task2, task3
- Track B: task4, task5
- Track C: task6

**Critical Path:** None / taskA → taskB → taskC

**Dependencies:**

- Blocks: [future tasks]
- Blocked by: [previous tasks]

**Team:** [X] people can work simultaneously

[Repeat for all phases...]
```

#### Task Detail Section:

```markdown
## 📋 Task Details by Phase

### Phase N: [Phase Name]

| Task ID | Description | Priority   | Status | Est. Time |
| ------- | ----------- | ---------- | ------ | --------- |
| [id]    | [desc]      | [P0/P1/P2] | [ ]    | [Xh/Xd]   |

**Dependencies:**

- Blocks: [task ids]
- Blocked by: [task ids]

**Acceptance Criteria:**

- [ ] Criteria 1
- [ ] Criteria 2

[Repeat for all tasks in phase...]
```

#### Dependency Graph Section:

```markdown
## 🗺️ Dependency Graph

**Critical Path:**
```

task1 → task2 → task3 → task4 → task5

```

**Parallel Execution Map:**
| Phase | Parallel Tracks | Max Concurrent Tasks |
|-------|---------------|---------------------|
| 0 | Track A, Track B, Track C | 6-8 |
| 1 | Track A, Track B | 3-4 |
[...]
```

**Team Recommendations:**

- **Optimal Team:** [X]-[Y] people
- **Person A (Focus):** [Phase name]
- **Person B (Focus):** [Phase name]
- **Person C (Focus):** [Phase name]
- **Person D (Focus):** [Phase name]

````

#### Risk Mitigation Section:
```markdown
## ⚠️ Risk Mitigation

### High-Risk Blockers:

1. **[Task ID] ([Task Name])** - Single point of failure
   - **Impact:** Blocks X downstream tasks
   - **Mitigation:** [Strategy]

2. **[Task ID] ([Task Name])** - Complex dependency chain
   - **Impact:** Delays entire phase
   - **Mitigation:** [Strategy]

[Repeat for all high-risk blockers...]
````

#### Progress Tracking Section:

```markdown
## ✅ Progress Tracking

### Phase Status:

- [ ] Phase 0: [Name] (X/X tasks completed)
- [ ] Phase 1: [Name] (X/X tasks completed)
- [ ] Phase 2: [Name] (X/X tasks completed)
      [...]

### Quick Reference:

**Ready NOW (No Blockers):** [list of task ids]
**Blocked Tasks:** [list of task ids with blockers]
**Critical Path:** [list of sequential task ids]

### Overall Progress: [X]%
```

### 4. Update .beads/ if needed:

**Adjust dependencies:**

- Are there unnecessary blockers that can be removed?
- Are there missing dependencies that should be added?
- Are priorities correctly assigned (P0=P0/P1/P2)?

**Suggest adjustments:**

- If dependencies are suboptimal, recommend changes
- If priorities are wrong, suggest reassignments

### 5. Return summary:

**Include:**

- Optimized workflow phases (names and durations)
- Critical path vs parallel opportunities
- TASKS.md content preview (show key sections)
- Any dependency adjustments recommended (if any)
- Team size recommendations
- Estimated total timeline

**Format:** Use markdown with clear section headers, tables, and code blocks for easy reading

```

---

## 🎯 When to Use This Prompt

**Use this prompt when:**
1. **Starting a new project phase** - Plan out all work
2. **Reorganizing after major changes** - Reassess dependencies
3. **Onboarding new team members** - Clear overview of work ahead
4. **Blocking analysis** - Understand what's blocking what
5. **Resource planning** - Determine optimal team size and assignments
6. **Mid-project checkpoint** - Assess progress and re-prioritize

---

## 📊 What You'll Get

**Output: TASKS.md file at project root with:**

1. **Phase breakdown** - Logical grouping of work
2. **Task details** - ID, description, priority, status, time estimates
3. **Dependency graph** - Visual representation of relationships
4. **Critical path analysis** - Sequential tasks that determine timeline
5. **Parallel opportunities** - Tasks that can be done simultaneously
6. **Team recommendations** - Optimal team size and assignments
7. **Risk mitigation** - Strategies for high-risk blockers
8. **Progress tracking** - Checkboxes and percentage completion

---

## 🚀 Quick Start

**Step 1:** Copy the prompt above
**Step 2:** Paste in your chat with Claude
**Step 3:** Wait for beads-task-agent analysis
**Step 4:** Review TASKS.md at project root
**Step 5:** Start with Phase 0 ready tasks

---

## 💡 Pro Tips

1. **Run regularly** - Update TASKS.md as tasks are completed
2. **Check for blockers** - Review "Blocked Tasks" section weekly
3. **Adjust priorities** - Re-prioritize if business needs change
4. **Use parallel tracks** - Maximize team efficiency
5. **Mitigate risks early** - Address high-risk blockers before they block work

---

## 🔍 Example Output Structure

```

# TASKS.md

**Project:** My Awesome Project
**Last Updated:** 2026-02-07
**Total Open Issues:** 37
**Total Phases:** 8

## 🚀 Optimized Workflow Phases

### Phase 0: Immediate Ready Tasks (Day 1)

**Ready NOW:** 13 tasks - Maximum parallelization opportunity

**Parallel Tracks:**

- Track A: task1, task2, task3
- Track B: task4, task5, task6
- Track C: task7, task8

**Team:** 6-7 people can work simultaneously

[... continues with all phases ...]

## 📋 Task Details by Phase

### Phase 0: Immediate Ready Tasks

| Task ID | Description         | Priority | Status | Est. Time |
| ------- | ------------------- | -------- | ------ | --------- |
| vtl     | Install Better Auth | P0       | [ ]    | 0.5h      |
| 1yz     | Configure env vars  | P0       | [ ]    | 0.5h      |

[... continues with all tasks ...]

## ✅ Progress Tracking

### Phase Status:

- [ ] Phase 0: Immediate Ready Tasks (0/13 tasks completed)
- [ ] Phase 1: Auth Implementation (0/7 tasks completed)

### Quick Reference:

**Ready NOW (No Blockers):** vtl, 1yz, 3qo, up0, 526, ara.1, ara.11-16, 2ef.1
**Blocked Tasks:** ara.2 (blocked by ara.1), ara.3 (blocked by ara.1, ara.15, ara.16)
**Critical Path:** vtl → 1yz → 3qo → up0 → 526 → 7sv → ara.4 → ara.5 → ara.7 → ara.8

### Overall Progress: 0%

```

---

## 📚 Related Documentation

- **Beads Task Agent**: `.opencode/context/task-management/guides/managing-tasks.md`
- **ContextScout**: `.opencode/skill/context-scout/SKILL.md`
- **Workflow Planning**: `.opencode/skill/WorkflowDesigner/SKILL.md`
- **Project Management**: `.opencode/context/task-management/standards/task-schema.md`
```
