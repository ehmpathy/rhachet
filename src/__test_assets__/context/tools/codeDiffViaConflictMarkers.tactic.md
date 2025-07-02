tactic(code:diff:conflictMarker)
.what = leverage conflict markers to declare code diffs
.why =
    - make it easy to observe and apply the code diffs proposed
    - interop with existing tools built into ide's which support conflict markers
.when =
    - whenever a code diff is desired, express it via conflict markers
.how =
   1. declare a codeblock via ``` open and close
   2. declare the file/path at the top via `// @file/path`
   3. declare the original code within `<<<<<<< ORIGINAL` and `=======`
   3. declare the modified code within `=======` and `>>>>>>> MODIFIED`

.example =

    ```ts
    // @src/logic/doSomething.ts
    <<<<<<< ORIGINAL
    original lines
    =======
    modified lines
    >>>>>>> MODIFIED
    ```
