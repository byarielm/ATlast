import { fileParser, FileParseError } from '../lib/fileParser';
import type { TikTokUser, SearchResult } from '../types';

export function useFileUpload(
  onSearchStart: (results: SearchResult[], platform: string) => void,
  onStatusUpdate: (message: string) => void
) {
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, platform: string = 'tiktok') {
    const file = e.target.files?.[0];
    if (!file) return;

    onStatusUpdate(`Processing ${file.name}...`);
    let users: TikTokUser[] = [];

    try {
      users = await fileParser.parseFile(file);
      
      const fileType = file.name.endsWith('.zip') ? 'ZIP' : 
                       file.name.endsWith('.json') ? 'JSON' : 
                       file.name.endsWith('.html') ? 'HTML' : 'TXT';
      console.log(`Loaded ${users.length} users from ${fileType} file`);
      onStatusUpdate(`Loaded ${users.length} users from ${fileType} file`);
    } catch (error) {
      console.error("Error processing file:", error);
      
      const errorMsg = error instanceof FileParseError 
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
      tiktokUser: user,
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