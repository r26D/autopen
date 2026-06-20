---
name: superpowers
description: "Router for superpowers skills. Use when the user says /superpowers without a specific sub-skill, or to see all available superpowers skills."
---

# Superpowers Skill Router

You've invoked the superpowers umbrella. Here are the available sub-skills — invoke the one that matches your task:

| Skill | When to use |
|-------|-------------|
| `superpowers:using-superpowers` | Starting any conversation — establishes how to find and use skills |
| `superpowers:brainstorming` | Before any creative work — features, components, new functionality |
| `superpowers:writing-plans` | Have a spec or requirements for a multi-step task, before touching code |
| `superpowers:executing-plans` | Have a written implementation plan to execute with review checkpoints |
| `superpowers:subagent-driven-development` | Executing implementation plans with independent tasks |
| `superpowers:dispatching-parallel-agents` | 2+ independent tasks with no shared state or sequential dependencies |
| `superpowers:test-driven-development` | Implementing any feature or bugfix, before writing implementation code |
| `superpowers:systematic-debugging` | Any bug, test failure, or unexpected behavior, before proposing fixes |
| `superpowers:requesting-code-review` | Completing tasks, major features, or before merging |
| `superpowers:receiving-code-review` | Receiving code review feedback, before implementing suggestions |
| `superpowers:verification-before-completion` | About to claim work is complete, before committing or creating PRs |
| `superpowers:finishing-a-development-branch` | Implementation complete, deciding how to integrate the work |
| `superpowers:using-git-worktrees` | Starting feature work that needs isolation from current workspace |
| `superpowers:writing-skills` | Creating, editing, or verifying skills |

Ask the user which skill they'd like to use, or if they described a task, invoke the matching skill directly.
