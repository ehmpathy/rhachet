# howto: put per-run test setup in `globalSetup`

## .what

jest runs `setupFilesAfterEnv` **once per suite file**. it runs `globalSetup` **once per run**.
setup that only has to happen once, such as a keyrack source or a daemon warmup, goes in
`globalSetup`.

## .why

- `setupFilesAfterEnv` looks like a one-time hook, but it runs before every test file.
- in this repo a keyrack source cost about 25s: a 2163-module import plus a child cli round trip.
  at the per-suite level, every file paid that 25s before its first test.
- a one-file acceptance run fell from 129s to 62s once the source moved. over the 111 acceptance
  files, the per-suite cost comes to about 45 min.

## .how

```ts
// jest.acceptance.globalSetup.ts
export default async (): Promise<void> => {
  const { keyrack } = await import('rhachet/keyrack');
  keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'lenient' });
};
```

```ts
// jest.acceptance.config.ts
globalSetup: './jest.acceptance.globalSetup.ts',
setupFilesAfterEnv: ['./jest.acceptance.env.ts'], // per-suite work only
```

## .what reaches the suites

| from `globalSetup` | reaches suites? |
|---|---|
| `process.env` writes | ✅ in-band suites share the process, and forked workers inherit its env |
| module state, globals, singletons | 🚫 each suite gets a fresh module registry. use env or disk |

## .the test

does this setup differ per suite file? if not, it goes in `globalSetup`.

## .see also

- `rule.require.thinnest-import-path` — the import half of the same cost
- `howto.run-jest-tiers-locally.[lesson]`
