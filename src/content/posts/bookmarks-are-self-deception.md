---
title: "Bookmarks are self-deception. A second brain built on Karpathy's LLM Wiki"
author: Yurii Liakhov
description: A practical take on the LLM Wiki pattern for a personal knowledge base — markdown, raw sources, topic pages, Obsidian Web Clipper, and Claude Code instead of endless bookmarks and Notion.
pubDate: 2026-07-01T12:00:00Z
draft: false
---

Bookmarking an article isn't the same as reading it.

But the brain fools us exactly like this: you save something to bookmarks and get a little sense of completion, as if the article is already part of your knowledge. In reality it just moved from the internet into another pile.

That pile had been growing for years: Angular, ProseMirror, AI agents, LLM workflows, architecture, product thinking, markdown, Obsidian, RAG. Some of it I read, some I saved "for later," but most of it I never came back to.

Notion was better than chaotic bookmarks, but the material still had to be reread, compressed, and connected by hand. The effort went into maintaining the notes, not into the knowledge itself — so after a while I simply stopped.

The new push came from Andrej Karpathy's post about the [LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). What I liked wasn't the idea itself but the structure: raw sources are source code, the wiki is the compiled artifact. Raw articles and documents stay as sources, while the knowledge lives in a maintained wiki where material is already cleaned up, compressed, and linked to topics. Later I found a similar practical example in Alex McFarland's write-up on the [content wiki Claude maintains for him](https://alexmcfarland.substack.com/p/how-claude-maintains-my-content-wiki) — which confirmed the approach can work as more than a nice idea.

So two things came together: Obsidian as a simple interface to markdown, and AI as an agent that does the thing that used to make me abandon these systems — compressing sources, updating topics, maintaining the index, and keeping the knowledge base from turning back into a pile of notes.

## The problem isn't saving

Saving a source is easy. The hard part is making it part of your knowledge system.

A bookmark only answers "where's the link?" But I need something else: what I understood, which topic it belongs to, what it connects to, and where I can apply the idea in practice.

An insight on its own is worth almost nothing. You can read a strong idea, agree with it, save it — and never use it. Value appears only when the idea goes through processing:

```txt
source → summary → topic update → backlinks → reusable knowledge
```

This is exactly the routine you don't want to do by hand: shorten the text, find related topics, update the index, add backlinks, avoid creating a duplicate. This is where an LLM agent is useful — not as an autonomous assistant that decides what I should know, but as a librarian that keeps the wiki in working order.

The human curates sources and asks questions. The agent maintains the derived layer of knowledge.

## How it works

The vault structure is simple:

```txt
second-brain/
├── AGENTS.md
├── raw/
├── wiki/
│   ├── index.md
│   ├── history.md
│   ├── sources/
│   ├── topics/
│   └── patterns/
├── projects/
└── skills/
    └── second-brain/
```

`raw/` — raw material, e.g. an article saved via Obsidian Web Clipper. These files are immutable: the agent never rewrites them, because they're the original.

`wiki/sources/` — short notes on a single source: the main argument, examples, key takeaway.

`wiki/topics/` — living topic pages. A new article on an existing topic doesn't spawn another note; it updates the topic page.

`wiki/patterns/` — generalizations that appear only when an idea recurs across several sources. The rule is strict: a pattern can be created only after 3+ sources, otherwise the agent starts making loud "insights" out of a single text.

`wiki/history.md` — my corrections that change the agent's behavior. If it makes the same mistake twice, I record the correction here, and it accounts for it from then on.

`projects/` — context on my projects: notes, backlog, decisions, status. Code lives in separate repositories; the memory of a project lives here.

`skills/second-brain/` — a bridge to the vault from external repositories. Through it the agent can work with the knowledge base even when I'm inside the code of a specific project.

I published this structure as a reusable template, including the `second-brain` skill: [github.com/Liakhov/second-brain-template](https://github.com/Liakhov/second-brain-template).

`AGENTS.md` — the center of the system. Rules for ingest, query, index updates, citation, behavior on contradictions, and the "don't spawn extra files" principle. Since all the rules live here, any agent that reads `AGENTS.md` works — Claude Code, Codex, Cursor; I use Claude Code.

Markdown matters here not as a philosophy but as a format: files sit locally, they can be read, edited, committed to git, and opened in Obsidian. The fewer layers between the agent and the knowledge, the less friction. At the start you don't need a vector DB, an embedding pipeline, or a separate service — a markdown folder, git, Obsidian, and an agent with filesystem access are enough.

## Ingest flow

A typical flow:

```txt
clip → ingest → review → done
```

I save an article to `raw/` and run ingest. The agent reads the file and shows a plan of changes:

```txt
Plan:
- Create wiki/sources/2026-07-01-karpathy-llm-wiki.md
- Update wiki/topics/llm-wiki-pattern.md
- Update wiki/index.md
 
Proceed?
```

After confirmation it creates the source note, updates the topic page, adds a link to the index, and checks that it hasn't spawned anything extra.

I didn't arrive at this scheme right away. The first version looked "more correct": atomic notes, operation specs, a source registry, templates, logs, ADR-like meta pages, separate rules for each type of action. Systematic on paper, cumbersome in practice.

The old scheme:

```txt
raw article → 6 atomic notes → source registry → log entry → index update → cross-links
```

The new one:

```txt
raw article → source note → topic update → index update
```

Less "smart," but far more practical. Ingesting a single article used to create 5–10 files I never opened afterward.

So I simplified everything down to three types of wiki page: `sources`, `topics`, `patterns`. For my use case that's enough.

## Why not atomic notes

For a long time I thought the right knowledge base should look like a Zettelkasten: one atomic idea, one file. But for an LLM-readable wiki the math is different.

In a Zettelkasten, atomic notes make sense because the human recombines the small ideas themselves. Claude, though, reads a 500-line topic file almost as easily as 50 files of 10 lines each — and for both it and me, it's simpler to work with one living page per topic.

Atomic notes create coordination overhead: remembering where everything is, maintaining links, avoiding duplicates, constantly deciding how atomic a thought should be.

So — one living page per topic. A new source doesn't create a micro-note; it adds a layer: a summary after the first article, a variation after the second, a caveat after the third, and after the tenth — my own position. This is where the knowledge base starts to pay off.

## What it gives in practice

An article used to disappear after I saved it. Now each source goes through distillation: what it claims, which examples it gives, what to take from it. The first layer of processing happens once, during ingest, rather than anew on every query. Even if I never open the original again, a compact version of the knowledge stays.

But the main value isn't in source notes — it's in topic pages. The fifth article on agent workflows doesn't sit on its own; it adds to the topic. Knowledge becomes cumulative — no longer a "list of links" but "my current position, assembled from several sources."

Another upside: answers are tied to my context. When I ask:

```txt
what do I know about loop engineering?
```

the agent reads `wiki/index.md` and the relevant topic pages instead of answering from the model's general memory. Often I don't need "the best answer from the internet" — I need an answer that accounts for what I've already read, tried, and phrased for myself.

And not only inside the vault. `projects/` holds documentation on projects — status, backlog, decisions — and a small `second-brain` skill connects any repository to that documentation and to the wiki, even when the vault isn't directly available from the project. For example, when I'm working in a project's repository, the agent can pull context from `projects/` or write a new conclusion back to the vault without leaving my working environment — under the same `AGENTS.md` rules. This way the knowledge base becomes a layer available from where I work, rather than a separate place I have to go to on purpose.

## Lessons learned

### A knowledge base works only if adding to it is easy

If adding a source creates friction, people stop maintaining the knowledge base. That's how my Notion stalled, and how the first version of `second-brain` nearly stalled too. So the flow stays as simple as possible.

### Frontmatter is a tax

Every required field is something the agent fills in and I never read afterward. The first version had `type`, `confidence`, `last_verified`, structured relationships — it looked right but gave no real benefit. Now only what I actually use remains; the rest lives in the note body or doesn't live at all.

### The agent fits the librarian role well

The most valuable thing isn't that the agent is "smart" — it's that it doesn't get tired of small upkeep: naming a file, updating the index, adding backlinks, not forgetting the date, finding an existing topic page instead of a duplicate. A human gets bored with this fast. The agent doesn't.

### Process masquerades as progress

The most unpleasant signal in the old version: a pile of rules, templates, operation specs, and logs — and almost no real wiki page I actually wanted to return to. It's easy to over-engineer a system (inbox, archive, concepts, entities, synthesis, lint scripts, ADR) and end up refining the infrastructure for knowledge instead of the knowledge itself. What helped me was not adding another layer, but removing what was unnecessary.

## Limitations

This system isn't perfect. Its value accumulates gradually: each source adds a layer to the topic pages, and the real effect shows up once a topic has collected several conflicting or complementary views. It's a slow compound, not an instant win.

There's a risk that the agent misunderstands a source and cements a mistake in the wiki. Hence the safeguards: `raw/` isn't edited, source pages are tied to their sources, topic pages link back to the source, and important changes go through review.

While the knowledge base is small, this is enough. If it grows, semantic search can be layered on top — but that would be a navigation mechanism over the wiki, not a replacement for the memory.

And one more thing: you can't design a system like this once and never touch it. Rules go stale, page names turn out to be poor, part of the structure becomes unnecessary, and some flows have to be rewritten after real use. That's normal — a second brain isn't an archive but a living system.

## Conclusion

`second-brain` isn't another Notion, nor a local ChatGPT with files. It's a markdown vault where the LLM takes the librarian role: I store raw sources, and the agent compresses them, updates topic pages, maintains the index, adds links, and brings knowledge back into work.

The value isn't in magic — it's that the gap between "I read something useful" and "it became part of my knowledge base" got much smaller.

Bookmarks gave me the illusion of progress. Notion gave a tidy archive. The first version of `second-brain` taught me a different lesson: even a good idea dies if there's too much process around it.

Markdown + an agent gives a system that can grow, but only if it stays simple enough. In knowledge management, the system that wins isn't the most perfect one — it's the one you actually come back to.
 
---

_Template: [github.com/Liakhov/second-brain-template](https://github.com/Liakhov/second-brain-template)_

_References: [Andrej Karpathy — LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f), [Alex McFarland — How Claude maintains my content wiki](https://alexmcfarland.substack.com/p/how-claude-maintains-my-content-wiki)_

_Stack: Claude Code, Obsidian Web Clipper, markdown, git_
