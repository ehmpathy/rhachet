import { withAssure } from 'type-fns';

/**
 * .what = assess whether a string is a legal SSM parameter name
 * .why = an explicit --exid is human-typed; validate it at the boundary so a malformed
 *        name fails loud with a fix before any SSM call, not as a raw SDK ValidationException
 *
 * .note = SSM name rules: a '/' prefix, segments of [a-zA-Z0-9_.-], '/' separators,
 *         no 'aws'/'ssm' prefix, max 2048 chars
 */
export const isKeyrackAwsParamName = withAssure(
  (value: string): value is string => {
    // reject empty or over-length
    if (value.length === 0 || value.length > 2048) return false;

    // a full-path name (with '/') must start with '/'
    if (value.includes('/') && !value.startsWith('/')) return false;

    // charset stays within the SSM-legal set, and no reserved 'aws'/'ssm' prefix
    return /^[a-zA-Z0-9_.\-/]+$/.test(value) && !/^\/?(aws|ssm)\//i.test(value);
  },
  { name: 'isKeyrackAwsParamName' },
);
