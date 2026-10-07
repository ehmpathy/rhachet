import { asBootRefBlock } from '@src/domain.operations/boot/asBootRefBlock';
import type { BootBatch } from '@src/domain.operations/boot/BootBatch';
import type { BootSource } from '@src/domain.operations/boot/BootSource';
import type { BootPlan } from '@src/domain.operations/boot/computeBootPlan';
import type { BootSayResource } from '@src/domain.operations/boot/getAllBootSayResources';

import { relative } from 'node:path';

/**
 * .what = labels a resource path for output — `prefix + relative(base, path)`
 * .why = a role keeps its synthetic `.agent/repo=…/role=…/` coordinates; a manifest has no
 *        coordinates to invent, so it renders a real repo-root-relative path a reader can open
 */
const asBootResourceLabel = (input: {
  label: BootSource['label'];
  path: string;
}): string => `${input.label.prefix}${relative(input.label.base, input.path)}`;

/**
 * .what = every say block of one kind, in order — the tag pair around each resource's content
 * .why = a readme, a say brief, and a say skill render in ONE shape and differ only in their tag
 */
const asBootSayBatches = (input: {
  resources: BootSayResource[];
  kind: BootSayResource['tag'];
  label: BootSource['label'];
}): BootBatch[] =>
  input.resources
    .filter((resource) => resource.tag === input.kind)
    .map((resource) => {
      const slug = asBootResourceLabel({
        label: input.label,
        path: resource.pathToLabel,
      });
      return {
        slug,
        kind: 'say' as const,
        lines: [
          `<${resource.tag} path="${slug}">`,
          resource.content,
          `</${resource.tag}>`,
          '',
        ],
      };
    });

/**
 * .what = a ref roster as one batch, or none where the roster is empty
 * .why = the block is the unit: its base is hoisted across every path in it
 */
const asBootRefBatches = (input: {
  tag: 'briefs.ref' | 'skills.ref';
  paths: string[];
}): BootBatch[] => {
  const lines = asBootRefBlock({ ...input, indent: '' });
  if (!lines.length) return [];
  return [{ slug: input.tag, kind: 'ref', lines }];
};

/**
 * .what = the `<also>` block — the resources a subject-scoped boot did not claim
 * .why = the remainder stays addressable rather than invisible; an empty remainder emits naught
 */
const asBootAlsoBatches = (input: {
  also: BootPlan['also'];
  label: BootSource['label'];
}): BootBatch[] => {
  const linesInner = [
    ...asBootRefBlock({
      tag: 'briefs.ref',
      paths: input.also.briefs.map((ref) =>
        asBootResourceLabel({ label: input.label, path: ref.pathToOriginal }),
      ),
      indent: '  ',
    }),
    ...asBootRefBlock({
      tag: 'skills.ref',
      paths: input.also.skills.map((path) =>
        asBootResourceLabel({ label: input.label, path }),
      ),
      indent: '  ',
    }),
  ];
  if (linesInner.length === 0) return [];

  // drop the final block's separator — the last block has no peer below it to part from
  return [
    {
      slug: 'also',
      kind: 'ref',
      lines: ['<also>', ...linesInner.slice(0, -1), '</also>', ''],
    },
  ];
};

/**
 * .what = the payload body as batches, in render order
 * .why = the order of these six segments IS the rendered order, so it reads as one flat
 *        composition a reader can check at a glance
 */
export const asBootPayloadBatches = (input: {
  resourcesSay: BootSayResource[];
  bootPlan: BootPlan;
  label: BootSource['label'];
}): BootBatch[] => [
  ...asBootSayBatches({
    resources: input.resourcesSay,
    kind: 'readme',
    label: input.label,
  }),
  ...asBootSayBatches({
    resources: input.resourcesSay,
    kind: 'brief.say',
    label: input.label,
  }),
  ...asBootRefBatches({
    tag: 'briefs.ref',
    paths: input.bootPlan.briefs.ref.map((ref) =>
      asBootResourceLabel({ label: input.label, path: ref.pathToOriginal }),
    ),
  }),
  ...asBootSayBatches({
    resources: input.resourcesSay,
    kind: 'skill.say',
    label: input.label,
  }),
  ...asBootRefBatches({
    tag: 'skills.ref',
    paths: input.bootPlan.skills.ref.map((path) =>
      asBootResourceLabel({ label: input.label, path }),
    ),
  }),
  ...asBootAlsoBatches({ also: input.bootPlan.also, label: input.label }),
];
