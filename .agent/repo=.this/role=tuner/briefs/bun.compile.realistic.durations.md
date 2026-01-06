# realistic bun compile (.bc) durations

## .what

expected startup times and binary sizes for bun-compiled single executables.

## .summary

| metric                | value     | notes                                   |
| --------------------- | --------- | --------------------------------------- |
| binary size           | 50-100MB  | bun runtime embedded in every binary    |
| cold start (no cache) | 200-400ms | binary load dominates                   |
| warm start (cached)   | 40-80ms   | OS page cache eliminates disk I/O       |
| bytecode improvement  | 1.38x     | --bytecode flag reduces startup by ~30% |
| CLI logic overhead    | 10-50ms   | actual JS execution time                |

## .binary size breakdown

bun-compiled binaries are large because they embed the full bun runtime:

- **hello world**: ~57MB (darwin-arm64) to ~100MB (windows)
- **151 modules**: ~100MB (rhachet run command)
- **855 modules**: ~115MB (rhachet all commands)

the bun team acknowledges: "Bun's binary is still way too big and we need to make it smaller" [1].

there's an open issue requesting a minimal runtime [2], but no solution exists yet.

## .startup time benchmarks

### bun compiled vs interpreted

| mode                   | mean startup | relative |
| ---------------------- | ------------ | -------- |
| bun run (interpreted)  | 77.0ms       | 1.0x     |
| bun compile            | 52.7ms       | 1.46x    |
| bun compile --bytecode | 38.3ms       | 2.01x    |

using `--bytecode` makes startup 1.38x faster than without [3].

### comparison with other runtimes

| runtime      | typical cold start | binary size |
| ------------ | ------------------ | ----------- |
| Go           | 5-20ms             | 5-20MB      |
| Rust         | 1-10ms             | 1-10MB      |
| Deno compile | 40-80ms            | 50-100MB    |
| Bun compile  | 40-80ms            | 50-100MB    |
| Node.js      | 100-300ms          | (runtime)   |

Go and Rust produce smaller, faster binaries because they compile to native code without a runtime [4][5].

### deno compile comparison

deno compile produces similar-sized binaries to bun:
- deno-compiled npm: 40.1ms avg (vs 75.2ms for regular npm) [6]
- deno added V8 code caching for even faster startup [7]
- 2024 improvements slimmed binaries by up to 50%

## .cold vs warm start

the ~200ms difference between cold and warm starts is due to:

1. **disk I/O**: loading 100MB binary from disk
2. **page faults**: OS memory mapping the binary
3. **cache population**: subsequent runs benefit from OS page cache

after warmup (3-5 runs), the binary stays in OS cache and load time drops to ~50ms.

## .recommended production settings

bun documentation recommends [1]:
```bash
bun build --compile --bytecode --minify --sourcemap ./src/index.ts
```

- `--bytecode`: faster startup (pre-compiled to bytecode)
- `--minify`: smaller bundle (less to parse)
- `--sourcemap`: debugging support in production

## .realistic expectations for rhachet

given the constraints:

| command     | expected duration | breakdown                          |
| ----------- | ----------------- | ---------------------------------- |
| run --skill | 250-350ms         | 200ms load + 50ms CLI + 50ms skill |
| roles boot  | 300-400ms         | 200ms load + 100-200ms CLI         |
| roles cost  | 300-400ms         | 200ms load + 100-200ms CLI         |

these durations are acceptable for CLI usage. for latency-critical paths, consider:
- keeping the process alive (daemon mode)
- using the JIT version (tsx) for development
- accepting that bun compile prioritizes distribution over cold start

## .sources

1. [Bun Single-file Executable Docs](https://bun.com/docs/bundler/executables) - official documentation on compile feature
2. [GitHub Issue #14546: Minimal runtime request](https://github.com/oven-sh/bun/issues/14546) - community request for smaller binaries
3. [Trying out Bun Compile to Bytecode](https://www.peterbe.com/plog/trying-bun-compile-to-bytecode) - bytecode performance benchmarks
4. [Rust vs Go vs Bun vs Node.js: 2024 Performance Showdown](https://dev.to/hamzakhan/rust-vs-go-vs-bun-vs-nodejs-the-ultimate-2024-performance-showdown-2jml) - cross-runtime comparison
5. [Building Great CLIs in 2025: Node.js vs Go vs Rust](https://medium.com/@no-non-sense-guy/building-great-clis-in-2025-node-js-vs-go-vs-rust-e8e4bf7ee10e) - CLI-specific comparison
6. [Deno Compile Executable Programs](https://deno.com/blog/deno-compile-executable-programs) - deno compile benchmarks
7. [Deno in 2024](https://deno.com/blog/deno-in-2024) - deno compile improvements
8. [Bun Cross-Compile Executables](https://developer.mamezou-tech.com/en/blogs/2024/05/20/bun-cross-compile/) - cross-platform binary sizes
9. [Snyk: Node vs Deno vs Bun Comparison](https://snyk.io/blog/javascript-runtime-compare-node-deno-bun/) - runtime performance overview
