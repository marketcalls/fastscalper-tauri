/** Joins the truthy class names, so conditional classes read inline. */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}
