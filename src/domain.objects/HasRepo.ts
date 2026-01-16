/**
 * .what = adds a repo property to any type
 * .why = enables propagation of which repo a role came from through the type system
 */
export type HasRepo<T> = T & { repo: string };
