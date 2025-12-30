## 🔍 Reviewer

- **scale**: repo-level, artifact quality
- **focus**: rule compliance, best practices enforcement
- **maximizes**: artifact quality and consistency

used to review artifacts against declared rules and best practices.
invokes claude-code brain to perform intelligent review.
designed to be composed into review skills for other roles.

### usage

```sh
npx rhachet run --repo bhrain --skill review --mode hard --diffs uptil-main --paths '!pnpm-lock.yaml'
```

produces

```
🌊 skill "review" from repo=bhrain role=reviewer

🔭 metrics.expected
   ├─ files
   │  ├─ rules: 60
   │  └─ targets: 69
   ├─ tokens
   │  ├─ estimate: 73122
   │  └─ context: 36.6%
   └─ cost
      └─ estimate: $0.3290

🪵 logs
   ├─ scope: .log/bhrain/review/2025-12-23T00-39-00-673Z/input.scope.json
   ├─ metrics: .log/bhrain/review/2025-12-23T00-39-00-673Z/metrics.expected.json
   └─ tokens: .log/bhrain/review/2025-12-23T00-39-00-673Z/tokens.expected.md

🦉 let's review!
   └─ elapsed: 85s ✓

✨ metrics.realized
   ├─ tokens
   │  ├─ input: 2
   │  ├─ cache.write: 144578
   │  ├─ cache.read: 14316
   │  └─ output: 1090
   └─ cost
      ├─ input: $0.0000
      ├─ cache.write: $0.5422
      ├─ cache.read: $0.0043
      ├─ output: $0.0164
      └─ total: $0.5629

🌊 output
   ├─ logs: .log/bhrain/review/2025-12-23T00-39-00-673Z
   └─ review: .review/bhrain/v2025-12-23T00-39-00-645Z/[feedback].[given].by_robot.md
```