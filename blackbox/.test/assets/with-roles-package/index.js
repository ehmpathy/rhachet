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
      hooks: {
        onBrain: {
          onBoot: [
            {
              // a `--manifest` boot, never `--role`: a role that boots itself from a hook is
              // refused at publish, since boot.md already renders it
              command:
                './node_modules/.bin/rhachet roles boot --manifest .behavior/boot.yml',
              timeout: 'PT60S',
            },
          ],
        },
      },
    },
  ],
};

exports.getRoleRegistry = () => registry;
