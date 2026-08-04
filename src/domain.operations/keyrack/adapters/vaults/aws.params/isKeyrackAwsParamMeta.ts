import { withAssure } from 'type-fns';

/**
 * .what = narrow stored meta to { region: string }
 * .why = stored meta arrives as an open union (a json blob); this type-check narrows it
 *        without an as-cast, so region reads as string safely (shapefit)
 */
export const isKeyrackAwsParamMeta = withAssure(
  (value: unknown): value is { region: string } =>
    typeof value === 'object' &&
    value !== null &&
    'region' in value &&
    typeof value.region === 'string' &&
    value.region.length > 0,
  { name: 'isKeyrackAwsParamMeta' },
);
