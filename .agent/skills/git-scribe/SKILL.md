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

## 3. Commit Message Generation
Construct a **Conventional Commit** message based on your analysis.

**Format:**
```
<type>(<scope>): <subject>

<body_paragraph>

- <bullet_point_1>
- <bullet_point_2>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semi colons, etc; no code change
- `refactor`: Refactoring production code
- `perf`: Performance improvement
- `test`: Adding tests, refactoring test; no production code change
- `chore`: Updating build tasks, package manager configs, etc; no production code change

**Guidelines:**
- **Subject:** Imperative, present tense ("add" not "added"). No period at the end.
- **Body:** Explain *what* and *why* vs. *how*.
- **Scope:** The module or component affected (e.g., `auth`, `ui`, `api`).

## 4. Execution
Commit with the structured message and push.

```bash
# multiline commit using -m for subject and -m for body
git commit -m "<type>(<scope>): <subject>" -m "<body_paragraph>" -m "- <bullet_point_1>" -m "- <bullet_point_2>"

# Push changes
git push -u origin <branch_name>
```
