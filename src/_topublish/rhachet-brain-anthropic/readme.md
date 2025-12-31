# rhachet-brain-anthropic

brain plugin for anthropic models in the rhachet ecosystem.

## install

```sh
npm install rhachet-brain-anthropic
```

## usage

```ts
import { genContextBrain } from 'rhachet';
import { getBrainAtomsByAnthropic, getBrainReplsByAnthropic } from 'rhachet-brain-anthropic';

const context = genContextBrain({
  atoms: [...getBrainAtomsByAnthropic()],
  repls: [...getBrainReplsByAnthropic()],
});

// use claude-opus-4.5 for inference
const result = await context.brain.atom.imagine({
  brain: { repo: 'anthropic', slug: 'claude-opus-4.5' },
  role: { briefs: roleArtifacts },
  prompt: 'analyze this code',
});

// use claude-code for agentic tasks
const result = await context.brain.repl.imagine({
  brain: { repo: 'anthropic', slug: 'claude-code' },
  role: { briefs: roleArtifacts },
  prompt: 'refactor this module',
});
```

## available brains

### atoms

- `anthropic/claude-opus-4.5` - claude opus 4.5 for advanced reasoning

### repls

- `anthropic/claude-code` - claude code for agentic coding tasks
