---
title: "Telegram + Claude + markdown: an AI fitness tracker for $1–3/month"
author: Yurii Liakhov
description: A personal fitness tracker in Telegram built on Claude and markdown files. Two months of usage, real billing from Anthropic Console, hybrid Haiku + Sonnet, $1–3/month.
pubDate: 2026-05-20T21:00:00Z
draft: false
---

What happens if you replace a fitness app with a Telegram chat and a few markdown files?

No separate UI, no forms, no endless buttons. Data is stored as plain text, workouts can be logged by voice, and the whole system costs around $1–3 per month.

I built this two months ago. And it turned out I use this fitness tracker more consistently than any standalone app I’ve tried before.

## The problem with fitness apps

I train three times a week. Pull-ups, dips, sometimes barbell work. Nothing serious — I just want to stay in shape, reduce stress, and feel better physically.

I train alone, without a coach. A coach at the gym could help with technique, but probably wouldn’t deeply analyze my workout history and overall context — especially if the data is already structured. That’s exactly the kind of problem where LLMs with full context have a real advantage.

I tried different fitness apps. Some were decent, but almost all of them had the same issue: too much friction.

To log a workout, you have to:

- open the app,
- find the exercise,
- select the weight,
- tap through multiple screens,
- enter the data manually.

After a week or two, I would stop using them.

I wanted something simpler:

send a message → save the data → ask “how’s my progress?”

## AI in Telegram that knows my workouts

I built [MILO](https://github.com/Liakhov/milo) — a personal AI assistant in Telegram powered by Claude. Most of the time I use it as a fitness tracker: logging workouts, checking my weight, asking what today’s program is. It also supports web search, and the skill-based architecture makes it easy to add new capabilities.

In practice, the interaction comes down to a few lines in Telegram or a voice message. Here are two typical scenarios from my week.

### After a workout

```
Me:    Pull-ups 15, 15, 15
       Dips 25, 25, 30

MILO:  Logged. 30 reps on the third set of dips — nice.
```

Three seconds. Right from the gym. Voice messages work too.

### Before a workout

```
Me:    what’s my workout for Wednesday?

MILO:  Wednesday — Volume:
       - Pull-ups — 6 x 12–15
       - Dips — 6 x 25
       - Chin-ups — 3 x max
       - L-Sit Hold — 3 x 20 sec
```

All examples are real messages from the logs.

## How it works

MILO is built around a single agent loop — no separate router or predefined workflows.

At a minimal level, the system consists of:

- three fitness skills (markdown instructions),
- two custom tools (read_data and write_data for working with markdown) plus Anthropic’s built-in web_search for non-fitness queries,
- SQLite for conversation history,
- markdown files as primary storage.

Before each request, a context builder assembles the context for Claude:

- system context (SYSTEM.md, SOUL.md),
- short descriptions of available skills,
- conversation history from SQLite,
- a list of available tools.

After that, the model decides on its own:

- whether a skill is needed,
- which tools to call,
- in what order,
- and when the response is complete.

For example:

- `pull-ups 15, 15, 15` → activates fitness-writer
- `what’s my weight?` → fitness-reader
- `build me a bulking program` → fitness-planner

When Claude activates a skill, the full SKILL.md is loaded into context on the next turn. Skills themselves are not code — they are markdown instructions with rules, steps, and trigger examples.

### Workout logging flow

1. Claude reads `workouts.md`
2. Analyzes the structure and current context
3. Optionally reads `profile.md` or `program.md`
4. Calls `write_data`
5. Appends the new workout to markdown
6. Returns a reply in Telegram

In other words, the LLM here is not just generating text — it actively modifies the system state through tools and markdown-based memory.

All of this works without a separate backend API, ORM, or CRUD logic. System state lives in markdown files, while SQLite acts as short-term conversational memory — storing message history for context, not as primary storage.

### Tiered context

To avoid loading the full context on every request, MILO uses a three-tier context system:

| Tier   | Content                 | Loaded when                       |
| ------ | ----------------------- | --------------------------------- |
| Tier 0 | `SOUL.md` + `SYSTEM.md` | always in context                 |
| Tier 1 | skill headers           | name + description always loaded  |
| Tier 2 | full `SKILL.md`         | only after activation             |

The model initially sees only short skill descriptions — the full markdown file is loaded only when a skill is actually needed. This reduces latency, lowers cost, and allows new skills to be added without changing code.

This tiered structure also works well with Anthropic prompt caching: Tier 0 and Tier 1 rarely change between requests, so most of the context is read from cache.

### Where the data lives

```
user/
├── SOUL.md
├── SYSTEM.md
└── memory/ → ../milo-memory
    └── fitness/
        ├── profile.md
        ├── program.md
        ├── workouts.md
        └── weight.md
```

Fitness data lives in a separate private repository (`milo-memory`) linked via a symlink. The MILO codebase can be public; personal data stays private.

### Why no dedicated router

A separate routing step adds latency, costs extra tokens, and still makes mistakes on ambiguous requests. Letting Claude decide which skill to activate turned out to be simpler and more reliable for conversational workflows.

> **Privacy note.** Fitness files are stored locally, but messages still go through the Telegram API and Anthropic API. This is not an offline-first system — it's closer to a convenient interface on top of a cloud LLM with local data storage. If full privacy is critical for you, self-hosted models are probably a better fit.

## Workout planning

I asked MILO to create a training plan focused only on pull-ups and dips. It first asked about my goals, then generated a program with specific sets and reps. Now when I ask "what should I train on Wednesday?", it looks at the program and tells me what's next.

Planning is much more convenient through Claude Code on a laptop — there's room for a longer conversation: refining goals, reviewing the plan, editing `program.md` directly. Telegram is mainly used for quick gym logs.

Besides logging, MILO also acts as a coach — explaining technique, not just returning numbers:

```
Me:    explain pull-ups in more detail

MILO:  Pull-ups (narrow grip) — 4 x 12
       Hands shoulder-width or narrower. Focus on the back.
       Move in a controlled way — no jerking.
```

## Model choice and cost

I tested the fitness skills on two models:

- Claude Haiku 4.5
- Claude Sonnet 4.6

The difference was very noticeable.

Haiku sometimes skipped parts of the instructions — for example, replying "Logged!" without actually executing the `write_data` tool call, meaning the workout wasn't saved. It also occasionally mixed up `append` and `overwrite`. This is a [known weakness](https://docs.anthropic.com/en/docs/build-with-claude/tool-use#best-practices) of smaller models when handling multi-step tool use reliably.

After switching to Sonnet, these issues almost completely disappeared. The downside is cost — Sonnet is noticeably more expensive, but prompt caching solves most of that problem.

The system prompt (~3,500 tokens) stays almost identical between requests. With caching, it gets loaded from cache and costs ~90% less:

```
Haiku without cache:  tokens_in: 4,493 | cache_hit: 0
Sonnet with cache:    tokens_in: 848   | cache_hit: 3,457
```

### Real cost

Billing over two months:

| Month        | Haiku | Sonnet | Total     |
| ------------ | ----- | ------ | --------- |
| April 2026   | $2.65 | $0.58  | **$3.23** |
| May 2026     | $0.09 | $0.62  | **$1.20** |

April was more expensive because of the migration week from Haiku to Sonnet. May reflects stable usage: workout logging, "what's today's workout?" queries, weight analysis. 

Steady-state cost is around **$1–2/month**.

Sonnet cache hit rate is ~82% — without caching, the same workload would cost roughly 3× more.

I didn't abandon Haiku completely: voice transcription and simple Q&A ("what's my weight?") still run on it. Fitness skills using `read_data` and `write_data` run on Sonnet. Routing happens at the code level.

## Lessons learned

### Natural language can be a better UI

Especially with voice messages: after a workout, it's easier to dictate "dips 25, 25, 30" than to open an app and enter the data manually.

The LLM here doesn't behave like a "smart autonomous agent." It behaves more like a thin layer between humans and structured data.

In a traditional app UI, every new workflow means:

- a new screen,
- a new form,
- a new button,
- more state management logic.

In a conversational UI, you often only need to describe intent in natural language.

### Prompt caching makes persistent context almost free

When `SYSTEM.md`, memory files, and skill headers repeat between requests, caching makes persistent context nearly free.

Without it, this workflow would cost significantly more, and price alone would probably force me back to a cheaper model.

### The hardest part is consistency

Most of the work wasn't prompts or tools — it was making the system behave consistently:

- not skipping steps,
- not breaking formatting,
- not overwriting data,
- not behaving differently between calls.

That's where the difference between an "AI demo" and a genuinely useful workflow becomes obvious.

## Conclusion

This is far from a perfect solution.

Messages still pass through the Telegram API and Anthropic API, markdown files are not a replacement for a real database, and the whole system depends heavily on prompt engineering, tool use, and careful context management.

But after two months of using it, something else became clear: AI here is useful not because of "agentic magic," but because it removes friction between humans and their own data.

The data stays under my control, while the agent performs a narrow and predictable job. At the same time, the system is easy to extend: adding new skills and workflows is much simpler than building new screens and UI flows in a traditional app.

More than two months of use, $1–3 per month, and the progress is visible directly in `workouts.md`.

That's enough.

---

_Code: [github.com/Liakhov/milo](https://github.com/Liakhov/milo)_
_Stack: TypeScript, Claude Sonnet 4.6, Telegram Bot API, SQLite, prompt caching_
