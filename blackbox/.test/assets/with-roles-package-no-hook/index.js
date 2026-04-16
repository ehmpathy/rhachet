/**
 * .what = entry point for rhachet-roles-test-no-hook fixture package
 * .why = tests failfast guard for roles with bootable content but no boot hook
 */
const path = require('path');

const packageRoot = __dirname;

const registry = {
  slug: 'test-no-hook',
  readme: { uri: path.join(packageRoot, 'readme.md') },
  roles: [
    {
      slug: 'mechanic',
      name: 'Mechanic',
      purpose: 'fix things',
      readme: { uri: path.join(packageRoot, 'roles/mechanic/readme.md') },
      traits: [],
      briefs: { dirs: { uri: path.join(packageRoot, 'roles/mechanic/briefs') } },
      skills: {
        dirs: { uri: path.join(packageRoot, 'roles/mechanic/skills') },
        refs: [],
      },
      // NOTE: intentionally lacks hooks.onBrain.onBoot to test failfast guard
    },
  ],
};

exports.getRoleRegistry = () => registry;
