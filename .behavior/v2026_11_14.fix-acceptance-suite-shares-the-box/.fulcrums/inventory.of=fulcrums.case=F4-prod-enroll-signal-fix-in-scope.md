# F4 — the prod `enroll` hangup fix rides this behavior

- **the fork**: fix prod `enroll` (end the brain on SIGHUP, stdin end, parent death) here, or split it to its own pr and fix only the test harness and stub here
- **taken**: in scope
- **why**: the issue lists *"`enroll` leaves no brain process alive after its own exit, in prod as in test"* as a done-when; and the stub fix alone would hide a prod leak behind a well-behaved stub
- **rework**: clean — case 10 and lever 5 lift out whole if the wisher splits them
- **confidence**: 75%
- **where**: yield lever 5; case 10
- **verdict**: confirmed by the director, 2026-11-15 — the prod `enroll` fix rides this behavior
