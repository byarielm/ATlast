import { parseFile, PlatformParseError } from '../lib/platforms/parser';
import type { SocialUser } from '../lib/platforms/types';
import type { SearchResult } from '../types';

export function useFileUpload(
  onSearchStart: (results: SearchResult[], platform: string) => void,
  onStatusUpdate: (message: string) => void
) {
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, platform: string = 'tiktok') {
    const file = e.target.files?.[0];
    if (!file) return;

    onStatusUpdate(`Processing ${file.name}...`);
    let users: SocialUser[] = [];

    try {
      // Use the new platform-based parser
      users = await parseFile(file, platform);
      
      console.log(`Loaded ${users.length} users from ${platform} data`);
      onStatusUpdate(`Loaded ${users.length} users from ${platform} data`);
    } catch (error) {
      console.error("Error processing file:", error);
      
      const errorMsg = error instanceof PlatformParseError 
        ? error.message
        : "There was a problem processing the file. Please check that it's a valid data export.";
      
      onStatusUpdate(errorMsg);
      alert(errorMsg);
      return;
    }
    
    if (users.length === 0) {
      const errorMsg = "No users found in the file.";
      onStatusUpdate(errorMsg);
      alert(errorMsg);
      return;
    }

    // Initialize search results
    const initialResults: SearchResult[] = users.map(user => ({
      tiktokUser: user, // TODO: Rename to sourceUser in types
      atprotoMatches: [],
      isSearching: false,
      selectedMatches: new Set<string>(),
      sourcePlatform: platform
    }));

    onStatusUpdate(`Starting search for ${users.length} users...`);
    onSearchStart(initialResults, platform);
  }

  return {
    handleFileUpload,
  };
}