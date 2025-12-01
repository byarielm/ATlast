import { parseDataFile } from "../lib/parsers/fileExtractor";
import type { SearchResult, UserSettings } from "../types";

export function useFileUpload(
  onSearchStart: (results: SearchResult[], platform: string) => void,
  onStatusUpdate: (message: string) => void,
  userSettings: UserSettings,
) {
  async function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    platform: string = "tiktok",
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    onStatusUpdate(`Processing ${file.name}...`);
    let usernames: string[] = [];

    try {
      usernames = await parseDataFile(file, platform);

      console.log(`Loaded ${usernames.length} users from ${platform} data`);
      onStatusUpdate(`Loaded ${usernames.length} users from ${platform} data`);
    } catch (error) {
      console.error("Error processing file:", error);

      const errorMsg =
        error instanceof Error
          ? error.message
          : "There was a problem processing the file. Please check that it's a valid data export.";

      onStatusUpdate(errorMsg);
      alert(errorMsg);
      return;
    }

    if (usernames.length === 0) {
      const errorMsg = "No users found in the file.";
      onStatusUpdate(errorMsg);
      alert(errorMsg);
      return;
    }

    const initialResults: SearchResult[] = usernames.map((username) => ({
      sourceUser: {
        username: username,
        date: "",
      },
      atprotoMatches: [],
      isSearching: false,
      selectedMatches: new Set<string>(),
      sourcePlatform: platform,
    }));

    onStatusUpdate(`Starting search for ${usernames.length} users...`);
    onSearchStart(initialResults, platform);
  }

  return {
    handleFileUpload,
  };
}
