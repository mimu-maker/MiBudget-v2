---
name: git-scribe
description: Creates feature branches with v0.5 prefix, analyzes code changes via git diff, and generates high-quality Conventional Commits.
---

# Git Scribe Workflow

Use this skill when the user wants to commit code, push changes, or create new feature branches. It ensures strict naming conventions and high-quality, descriptive commit messages.

## 1. Branch Management
**Rule:** All new feature/fix branches MUST start with `v0.5-`.

- **Check Current Branch:** 
  ```bash
  git branch --show-current
  ```
- **New Branch Creation:**
  - If user requests "new branch for auth", derive name: `v0.5-feat-auth`.
  - Command: `git checkout -b <v0.5-branch_name>`

## 2. Staging and Analysis
1. **Stage Changes:**
   ```bash
   git add .
   # OR specific files if requested
   git add <file_path>
   ```
2. **Analyze Changes (CRITICAL):**
   - Run `git diff --staged` or `git diff --cached`.
   - **Do not guess what changed.** Read the diff output to understand the exact logic modifications.
   - Look for:
     - New functions/components.
     - Changed logic in existing functions.
     - UI/styling updates.
     - Bug fixes.

## 3. Local Scribe (Session Recording)
Use this role during active implementation to maintain a persistent record of changes without making Git commits.

- **Objective**: Appending brief, descriptive notes to `.agent/IMPLEMENTATION_LOG.md`.
- **Command**: Use `write_to_file` in append mode (or read then write).
- **Format**: `[<TIMESTAMP>] <scope>: <brief description of what changed and why>`
- **Example**: `[2024-03-20 14:00] feat(auth): added validation for password strength.`

## 4. Commit Message Generation
When the user is ready to commit, construct a **Conventional Commit** message by synthesizing technical diffs and local notes.

**CRITICAL STEPS:**
1. **Read the Log**: Always run `view_file` on `.agent/IMPLEMENTATION_LOG.md`. This captures the "why" and any subtle logic changes you might miss in a raw diff.
2. **Analyze the Diff**: Run `git diff --staged`.
3. **Synthesize**: Combine the log's narrative with the diff's technical details.

**Format:**
```
<type>(<scope>): <subject>

<body_paragraph>

- <bullet_point_1>
- <bullet_point_2>
```

... (rest of the Conventional Commit types unchanged)

## 5. Execution & Cleanup
1. **Commit**: Use the synthesized message.
2. **Push**: If requested or standard for the branch.
3. **Cleanup (MANDATORY)**: Clear or delete `.agent/IMPLEMENTATION_LOG.md` after a successful commit to prepare for the next task.
