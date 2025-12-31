# rhachet-brain-anthropic

brain plugin for anthropic models in the rhachet ecosystem.

## install

```sh
npm install rhachet-brain-anthropic
```

## usage

### direct factory usage

```ts
import { genBrainAtom, genBrainRepl } from 'rhachet-brain-anthropic';
import { z } from 'zod';

// create a brain atom for direct model inference
const brainAtom = genBrainAtom({ slug: 'claude/haiku' });

const result = await brainAtom.ask({
  role: { briefs: [] },
  prompt: 'explain this code',
  schema: { output: z.object({ content: z.string() }) },
});

// create a brain repl for agentic tasks
const brainRepl = genBrainRepl({ slug: 'claude/code' });

const result = await brainRepl.ask({
  role: { briefs: roleArtifacts },
  prompt: 'analyze this codebase',
  schema: { output: z.object({ content: z.string() }) },
});

// use act() for read+write operations
const result = await brainRepl.act({
  role: { briefs: roleArtifacts },
  prompt: 'refactor this module',
  schema: { output: z.object({ content: z.string() }) },
});
```

### with rhachet context

```ts
import { genContextBrain } from 'rhachet';
import { getBrainAtomsByAnthropic, getBrainReplsByAnthropic } from 'rhachet-brain-anthropic';

const context = genContextBrain({
  atoms: [...getBrainAtomsByAnthropic()],
  repls: [...getBrainReplsByAnthropic()],
});

// use claude atom for inference
const result = await context.brain.atom.imagine({
  brain: { repo: 'anthropic', slug: 'claude/opus' },
  role: { briefs: roleArtifacts },
  prompt: 'analyze this code',
});

// use claude code for agentic tasks
const result = await context.brain.repl.imagine({
  brain: { repo: 'anthropic', slug: 'claude/code' },
  role: { briefs: roleArtifacts },
  prompt: 'refactor this module',
});
```

## available brains

### atoms (via genBrainAtom)

stateless inference without tool use.

| slug | model | description |
|------|-------|-------------|
| `claude/haiku` | claude-haiku-4-5 | fastest and most cost-effective |
| `claude/haiku/v3.5` | claude-3-5-haiku | fast and cost-effective |
| `claude/haiku/v4.5` | claude-haiku-4-5 | fastest and most cost-effective |
| `claude/sonnet` | claude-sonnet-4-5 | balanced performance and capability |
| `claude/sonnet/v4` | claude-sonnet-4 | balanced performance and capability |
| `claude/sonnet/v4.5` | claude-sonnet-4-5 | balanced performance and capability |
| `claude/opus` | claude-opus-4-5 | most capable for complex reasoning |
| `claude/opus/v4` | claude-opus-4 | highly capable for complex reasoning |
| `claude/opus/v4.5` | claude-opus-4-5 | most capable for complex reasoning |

### repls (via genBrainRepl)

agentic coding assistant with tool use via claude-agent-sdk.

| slug | model | description |
|------|-------|-------------|
| `claude/code` | default | uses SDK default model |
| `claude/code/haiku` | claude-haiku-4-5 | fast + cheap for simple tasks |
| `claude/code/haiku/v4.5` | claude-haiku-4-5 | fast + cheap for simple tasks |
| `claude/code/sonnet` | claude-sonnet-4-5 | balanced agentic performance |
| `claude/code/sonnet/v4` | claude-sonnet-4 | balanced agentic performance |
| `claude/code/sonnet/v4.5` | claude-sonnet-4-5 | balanced agentic performance |
| `claude/code/opus` | claude-opus-4 | highest quality for complex tasks |
| `claude/code/opus/v4.5` | claude-opus-4-5 | highest quality for complex tasks |
