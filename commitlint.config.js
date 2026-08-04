module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [1, 'always', 140],
    // disabled: squash-merge collapses a pr's commits into one body that concatenates
    // each sub-commit's subject + footers (urls, arns, code refs). those lines routinely
    // exceed a per-line limit, so config-conventional's error-level body-max-line-length
    // fails test:commits on the release pr (which lints from the last tag through the
    // squashed merge commit). headers stay bounded via header-max-length above.
    'body-max-line-length': [0, 'always', 100],
    'type-enum': [
      2,
      'always',
      [
        'break', // use break: instead of feat!: or BREAKING CHANGE footer
        'feat',
        'fix',
        // 'docs', // prefer fix(docs): instead of docs
        'chore',
        'revert',
        'cont', // continue progress within a p
      ],
    ],
    // forbid ! prefix (use break: instead)
    'subject-exclamation-mark': [2, 'never'],
  },
};
