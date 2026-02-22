import type { ContextCli } from '@src/domain.objects/ContextCli';
import { getRoleRegistriesByConfigImplicit } from '@src/domain.operations/config/getRoleRegistriesByConfigImplicit';

/**
 * .what = shows usage instructions when init called without --roles
 * .why = guides users on how to use the command
 */
export const showInitUsageInstructions = async (
  context: ContextCli,
): Promise<{ output: string }> => {
  // discover manifests from packages
  const { manifests, errors } =
    await getRoleRegistriesByConfigImplicit(context);

  // build usage output
  const lines: string[] = [];

  lines.push('usage: npx rhachet init --roles <role...>');
  lines.push('');

  // check if any packages found
  if (manifests.length === 0 && errors.length === 0) {
    lines.push('no rhachet-roles-* packages found.');
    lines.push('');
    lines.push('to use roles from packages, install a rhachet-roles package:');
    lines.push('  npm install rhachet-roles-ehmpathy');
    lines.push('');
    const output = lines.join('\n');
    console.log(output);
    return { output };
  }

  // list available roles
  if (manifests.length > 0) {
    lines.push('available roles:');

    // collect all roles with their source package
    const roleEntries: { role: string; package: string }[] = [];
    for (const manifest of manifests) {
      for (const role of manifest.roles) {
        roleEntries.push({
          role: role.slug,
          package: `rhachet-roles-${manifest.slug}`,
        });
      }
    }

    // find max role length for pad
    const maxRoleLength = Math.max(...roleEntries.map((e) => e.role.length));

    // output each role
    for (const entry of roleEntries) {
      const pad = ' '.repeat(maxRoleLength - entry.role.length + 2);
      lines.push(`  ${entry.role}${pad}(from ${entry.package})`);
    }

    lines.push('');
  }

  // note any packages without manifests
  if (errors.length > 0) {
    lines.push('packages without rhachet.repo.yml:');
    for (const { packageName } of errors) {
      lines.push(`  ${packageName}`);
    }
    lines.push('');
    lines.push(
      'run `npx rhachet repo introspect` in those packages to generate the manifest.',
    );
    lines.push('');
  }

  // show examples
  if (manifests.length > 0) {
    const firstManifest = manifests[0];
    const secondManifest = manifests[1];
    const firstRole = firstManifest?.roles[0]?.slug ?? 'mechanic';
    const secondRole =
      firstManifest?.roles[1]?.slug ?? secondManifest?.roles[0]?.slug;

    lines.push('examples:');
    lines.push(`  npx rhachet init --roles ${firstRole}`);
    if (secondRole) {
      lines.push(`  npx rhachet init --roles ${firstRole} ${secondRole}`);
    }
    lines.push(
      `  npx rhachet init --roles ${firstManifest?.slug ?? 'ehmpathy'}/${firstRole}`,
    );
    lines.push('');
  }

  const output = lines.join('\n');
  console.log(output);
  return { output };
};
