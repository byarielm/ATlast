/**
 * Normalize a string for comparison purposes
 *
 * @param str - The string to normalize
 * @returns Normalized lowercase string
 **/
export function normalize(str: string): string {
  return str.toLowerCase().replace(/[._-]/g, "");
}
