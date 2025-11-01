import JSZip from "jszip";
import type { TikTokUser } from '../types';

export class FileParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileParseError';
  }
}

export const fileParser = {
  async parseJsonFile(jsonText: string): Promise<TikTokUser[]> {
    const users: TikTokUser[] = [];
    const jsonData = JSON.parse(jsonText);

    const followingArray = jsonData?.["Your Activity"]?.["Following"]?.["Following"];

    if (!followingArray || !Array.isArray(followingArray)) {
      throw new FileParseError(
        "Could not find following data in JSON. Expected path: Your Activity > Following > Following"
      );
    }

    for (const entry of followingArray) {
      users.push({
        username: entry.UserName,
        date: entry.Date || "",
      });
    }

    return users;
  },

  parseTxtFile(text: string): TikTokUser[] {
    const users: TikTokUser[] = [];
    const entries = text.split("\n\n").map((b) => b.trim()).filter(Boolean);

    for (const entry of entries) {
      const userMatch = entry.match(/Username:\s*(.+)/);
      if (userMatch) {
        users.push({ username: userMatch[1].trim(), date: "" });
      }
    }

    return users;
  },

  async parseZipFile(file: File): Promise<TikTokUser[]> {
    const zip = await JSZip.loadAsync(file);

    // Looking for Following.txt
    const followingFile =
      zip.file("TikTok/Profile and Settings/Following.txt") ||
      zip.file("Profile and Settings/Following.txt") ||
      zip.files[
        Object.keys(zip.files).find(
          (path) => path.endsWith("Following.txt") && path.includes("Profile")
        ) || ""
      ];

    if (followingFile) {
      const followingText = await followingFile.async("string");
      return this.parseTxtFile(followingText);
    }

    // If no TXT, look for JSON at the top level
    const jsonFileEntry = Object.values(zip.files).find(
      (f) => f.name.endsWith(".json") && !f.dir
    );

    if (!jsonFileEntry) {
      throw new FileParseError(
        "Could not find Following.txt or a JSON file in the ZIP archive."
      );
    }

    const jsonText = await jsonFileEntry.async("string");
    return this.parseJsonFile(jsonText);
  },

  async parseFile(file: File): Promise<TikTokUser[]> {
    if (file.name.endsWith(".json")) {
      return this.parseJsonFile(await file.text());
    } else if (file.name.endsWith(".txt")) {
      return this.parseTxtFile(await file.text());
    } else if (file.name.endsWith(".zip")) {
      return this.parseZipFile(file);
    } else {
      throw new FileParseError("Please upload a .txt, .json, or .zip file");
    }
  }
};