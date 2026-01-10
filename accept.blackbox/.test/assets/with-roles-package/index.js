/**
 * .what = entry point for rhachet-roles-test fixture package
 * .why = exports getRoleRegistry for repo introspect command
 */
const path = require('path');

const packageRoot = __dirname;

const registry = {
  slug: 'test',
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
    },
  ],
};

exports.getRoleRegistry = () => registry;
