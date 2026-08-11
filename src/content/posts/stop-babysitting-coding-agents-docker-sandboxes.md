---
title: "Stop Babysitting Coding Agents. Give Them Their Own Machine."
author: Yurii Liakhov
description: How I use Docker Sandboxes to let Claude Code and Codex work independently without giving them unrestricted access to my laptop.
pubDate: 2026-08-11T08:31:04Z
draft: false
---

Coding agents now take up a large part of my development workflow.

I use Claude Code mostly for a work project. For personal projects, experiments, and learning, I spend much more time with Codex.

They work best when I give them clear requirements, constraints, an expected result, and a reliable way to verify that result.

With that in place, the agent can handle most of the implementation loop itself: inspect the code, make changes, run tests, fix failures, and continue until the task is done.

Permissions are where this workflow usually slows down.

I already allow a small set of commands that I consider safe and predictable. That removes many unnecessary approvals, but larger tasks eventually need something outside that list.

Claude Code and Codex can skip those approvals entirely with `--dangerously-skip-permissions` and `--dangerously-bypass-approvals-and-sandbox`.

I wouldn't run either of these modes directly on my development machine. The whole point is to move that level of access into a separate environment where the agent can work freely without getting the same access to the rest of my laptop.

Claude Code and Codex already include their own permission and sandboxing mechanisms. Docker Sandboxes don't replace them. They move the boundary one level out by running the entire agent inside an isolated machine.

```txt
more restrictions → safer machine, less autonomy
fewer restrictions → more autonomy, larger blast radius
```

Docker Sandboxes let me move that trade-off outside the agent.

## Restrict the environment instead of the agent

Docker Sandboxes run the coding agent inside an isolated microVM with its own Linux environment and Docker Engine.

Inside that environment, the agent can install packages, use `sudo`, start services, run Docker, break something, fix it, and try again.

I expose only the project and integrations required for the task.

```txt
My laptop
│
├── credentials
├── other repositories
├── host Docker
│
└── Docker Sandbox
    ├── Claude Code / Codex
    ├── Linux
    ├── sudo
    ├── private Docker Engine
    └── project workspace
```

That machine exists for the agent.

## Getting started

From a project directory, I can start Claude Code with:

```bash
sbx run claude
```

or Codex with:

```bash
sbx run codex
```

Docker starts them in a mode that allows them to execute commands without stopping for approval each time.

That is pretty much the point.

I won't turn this article into an installation guide. The [Docker Sandboxes documentation](https://docs.docker.com/ai/sandboxes/) already covers installation, networking, credentials, ports, and configuration.

The more useful question is where this setup improves day-to-day development.

## 1. Long-running implementation tasks

Many development tasks need several iterations.

The agent reads the code, tries an implementation, runs the tests, finds another issue, changes the implementation, and tests again.

If I already defined the requirements and validation criteria, I don't want the whole process to depend on me being there every few minutes.

I want to give it the task, let it keep working, and review the result afterward.

## 2. Browser testing and temporary dependencies

Browser testing often expands the environment requirements of an otherwise simple task.

The agent may need Playwright, browser binaries, system packages, a running application, screenshots, and several rounds of testing.

I don't want to install all of that on my laptop just because the agent needs it for one task.

Inside a sandbox, it can install whatever it needs.

Those dependencies stay inside the environment created for the agent.

This works well for experiments too. The agent can try a package, change a system dependency, or install another tool without changing my local development setup.

## 3. Projects that depend on Docker

Many projects need more than application code.

A typical development environment might include a database, Redis, queues, background workers, or several services managed through `docker compose`.

Giving an agent access to Docker means it can set up and test that environment itself.

Giving it access to my host Docker daemon is a different decision.

Docker Sandboxes provide a separate Docker Engine inside the sandbox.

The agent can build images, start containers, remove them, recreate the stack, and experiment without touching the Docker environment running on my laptop.

That separation is especially useful when I want the agent to keep working without me watching every step.

## 4. Larger changes that I want to review afterward

For small interactive tasks, letting the agent edit my current working tree is usually fine.

For larger tasks, I prefer clone mode:

```bash
sbx run --clone claude
```

The sandbox gets its own copy of the repository. The agent can modify it independently without changing my local working tree.

Afterward, I review the result and decide which changes I want to bring back.

I like this model much more for larger tasks.

It feels closer to delegating work to another developer: I care about the requirements and the result, not about watching every file change as it happens.

## 5. Access to GitHub and other services

Useful coding agents eventually need access to tools outside the repository.

That might include GitHub, internal APIs, package registries, or other development services.

The agent should get only the capabilities required for the task. It shouldn't automatically receive every credential available on my machine.

Docker Sandboxes can keep supported credentials on the host while allowing the sandbox to use the corresponding integration.

The agent gets the capability it needs.

It doesn't necessarily need the secret itself.

## What a sandbox does not solve

Isolation doesn't make generated code correct.

An agent can misunderstand a requirement, make a poor architectural decision, introduce a subtle regression, or produce code that passes the tests while still solving the wrong problem.

I still review its work.

Sandboxes also add some overhead. Each one has its own environment, dependencies, tools, and Docker images.

The level of isolation also depends on how I run the sandbox.

In direct mode, the project workspace is shared with the sandbox, so the agent can modify those files directly.

Clone mode creates a separate copy of the repository. I prefer that for larger tasks because the agent can work freely without touching my local working tree.

The sandbox mainly limits the damage a mistake can cause.

It doesn't remove the need for good requirements, tests, or code review.

## Conclusion

My workflow with coding agents hasn't changed much at the beginning or the end of a task.

I still define the requirements, provide context, specify how the result should be validated, and review the final changes.

Docker Sandboxes change the part in the middle.

Claude Code or Codex can install what they need, run services, use Docker, execute tests, fail, retry, and continue working without waiting for me to approve every step.

That makes coding agents much more practical for larger development tasks while keeping their working environment separate from the rest of my laptop.

---
