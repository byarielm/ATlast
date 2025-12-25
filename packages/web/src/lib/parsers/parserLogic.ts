import { ParseRule } from "./platformDefinitions";

/**
 * Parses content using a regular expression.
 * @param content The string content (HTML or plain text) to search within.
 * @param regexPattern The regex string defining the capture group for the username.
 * @returns An array of extracted usernames.
 **/
export function parseTextOrHtml(
  content: string,
  regexPattern: string,
): string[] {
  try {
    // 'g' for global matching, 's' for multiline (DOTALL equivalent)
    const pattern = new RegExp(regexPattern, "gs");

    // matchAll returns an iterator of matches; we spread it into an array.
    const matches = [...content.matchAll(pattern)];

    // We map the results to the first captured group (match[1]), filtering out empty results.
    return matches.map((match) => match[1].trim()).filter((name) => !!name);
  } catch (e) {
    console.error(`ERROR: Invalid regex pattern '${regexPattern}':`, e);
    return [];
  }
}

/**
 * Traverses a JSON object structure to extract usernames from a nested array of objects.
 * Assumes the common pattern: navigate to an array, and extract a key from each object in that array.
 * @param content The JSON content as a string.
 * @param pathKeys The array of keys defining the path, where the second to last key is the array key, and the last key is the target username field.
 * @returns An array of extracted usernames.
 */
export function parseJson(content: string, pathKeys: string[]): string[] {
  try {
    const data = JSON.parse(content);
    const usernames: string[] = [];

    if (pathKeys.length < 2) {
      console.error(
        "JSON rule must have at least two path keys (list key and target key).",
      );
      return [];
    }

    // Determine the navigation path
    let currentData: any = data;
    const listContainerPath = pathKeys.slice(0, -2);
    const listKey = pathKeys[pathKeys.length - 2];
    const targetKey = pathKeys[pathKeys.length - 1];

    // 1. Traverse down to the object containing the target array
    for (const key of listContainerPath) {
      if (
        typeof currentData === "object" &&
        currentData !== null &&
        key in currentData
      ) {
        currentData = currentData[key];
      } else {
        console.error(
          `ERROR: Could not traverse JSON path up to key: ${key}. Path: ${listContainerPath.join(" -> ")}`,
        );
        return [];
      }
    }

    // 2. Check if the penultimate key holds the array
    if (
      typeof currentData === "object" &&
      currentData !== null &&
      listKey in currentData
    ) {
      const userList = currentData[listKey];

      if (Array.isArray(userList)) {
        // 3. Iterate over the array and extract the final target key
        for (const item of userList) {
          if (typeof item === "object" && item !== null && targetKey in item) {
            // Found the username
            usernames.push(String(item[targetKey]));
          }
        }
      } else {
        console.error(
          `ERROR: Expected an array at key '${listKey}' but found a different type.`,
        );
      }
    } else {
      console.error(
        `ERROR: List key '${listKey}' not found at its expected position.`,
      );
    }

    return usernames;
  } catch (e) {
    if (e instanceof SyntaxError) {
      console.error(`ERROR: Could not decode JSON content:`, e);
    } else {
      console.error(`An unexpected error occurred during JSON parsing:`, e);
    }
    return [];
  }
}

/**
 * Universal wrapper to apply the correct parsing method based on the rule's format.
 * @param content The file content as a string.
 * @param rule The ParseRule to apply.
 * @returns An array of extracted usernames.
 */
export function parseContent(content: string, rule: ParseRule): string[] {
  if (rule.format === "HTML" || rule.format === "TEXT") {
    if (typeof rule.rule === "string") {
      return parseTextOrHtml(content, rule.rule);
    }
  } else if (rule.format === "JSON") {
    if (Array.isArray(rule.rule)) {
      return parseJson(content, rule.rule);
    }
  }
  console.error(
    `ERROR: Unsupported format or invalid rule type for rule with path: ${rule.zipPath}`,
  );
  return [];
}
