// Use string literals for type safety on formats
export type FileFormat = "HTML" | "TEXT" | "JSON";

// Define the structure for a single parsing rule
export interface ParseRule {
  zipPath: string; // File path *inside* the ZIP archive
  format: FileFormat; // Expected format of the file, e.g. 'HTML', 'TEXT', 'JSON'
  rule: string | string[]; // specific extraction rule (regex pattern string or JSON key path array)
}

/*
    PLATFORM DEFINITIONS
    This constant holds all the defined extraction rules, grouped by platform.
*/

export const PLATFORM_RULES: Record<string, ParseRule[]> = {
  instagram: [
    {
      zipPath: "connections/followers_and_following/following.html",
      format: "HTML",
      // Regex captures the username group 'beautyscicomm' from the URL:
      // https://www.instagram.com/_u/beautyscicomm
      // Note: The 'g' and 's' flags are handled in the extractor method.
      rule: '<a target="_blank" href="https://www.instagram.com/_u/([^"]+)"',
    },
    {
      zipPath: "connections/followers_and_following/following.json",
      format: "JSON",
      rule: ["relationships_following", "title"],
    },
  ],

  tiktok: [
    {
      zipPath: "TikTok/Profile and Settings/Following.txt",
      format: "TEXT",
      // Regex captures the text after "Username: " on the same line
      rule: "Username:\s*([^\r\n]+)",
    },
    {
      zipPath: "user_data_tiktok.json",
      format: "JSON",
      // JSON key path to traverse: ['Your Activity'] -> ['Following'] -> ['Following'] -> 'UserName'
      rule: ["Your Activity", "Following", "Following", "UserName"],
    },
  ],
};

export function getRulesForPlatform(platformName: string): ParseRule[] {
  // Retrieves the list of parsing rules for a given platform.
  return PLATFORM_RULES[platformName.toLowerCase()] || [];
}
