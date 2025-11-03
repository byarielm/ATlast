import type { PlatformConfig, PlatformParser, FileBundle, SocialUser } from './types';
import { PlatformParseError } from './types';

// TXT Parser for TikTok Following.txt format
const txtParser: PlatformParser = {
  name: 'TikTok TXT',
  canParse: (bundle: FileBundle) => {
    // Look for .txt files that might be TikTok format
    for (const [_, file] of bundle.files) {
      if (file.name.toLowerCase().includes('following') && file.type === 'text') {
        return file.content.includes('Username:');
      }
    }
    return false;
  },
  parse: async (bundle: FileBundle) => {
    const users: SocialUser[] = [];
    
    // Find the TikTok following.txt file
    let content = '';
    for (const [_, file] of bundle.files) {
      if (file.name.toLowerCase().includes('following') && file.type === 'text') {
        content = file.content;
        break;
      }
    }
    
    if (!content) {
      throw new PlatformParseError('No TikTok following.txt file found', 'tiktok');
    }
    
    const entries = content.split("\n\n").map((b) => b.trim()).filter(Boolean);
    
    for (const entry of entries) {
      const userMatch = entry.match(/Username:\s*(.+)/);
      if (userMatch) {
        users.push({ username: userMatch[1].trim(), date: "" });
      }
    }
    
    return users;
  }
};

// JSON Parser for TikTok JSON exports
const jsonParser: PlatformParser = {
  name: 'TikTok JSON',
  canParse: (bundle: FileBundle) => {
    for (const [_, file] of bundle.files) {
      if (file.type === 'json') {
        try {
          const data = JSON.parse(file.content);
          return !!data?.["Your Activity"]?.["Following"]?.["Following"];
        } catch {
          return false;
        }
      }
    }
    return false;
  },
  parse: async (bundle: FileBundle) => {
    const users: SocialUser[] = [];
    
    // Find and parse JSON file
    for (const [_, file] of bundle.files) {
      if (file.type === 'json') {
        try {
          const jsonData = JSON.parse(file.content);
          const followingArray = jsonData?.["Your Activity"]?.["Following"]?.["Following"];
          
          if (!followingArray || !Array.isArray(followingArray)) {
            continue;
          }
          
          for (const entry of followingArray) {
            users.push({
              username: entry.UserName,
              date: entry.Date || "",
            });
          }
          
          if (users.length > 0) {
            return users;
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    throw new PlatformParseError(
      'No valid TikTok JSON data found. Expected path: Your Activity > Following > Following',
      'tiktok'
    );
  }
};

// TikTok Platform Configuration
export const tiktokPlatform: PlatformConfig = {
  id: 'tiktok',
  name: 'TikTok',
  parsers: [txtParser, jsonParser], // Try TXT first (most common)
  expectedFiles: ['Following.txt', 'user_data.json'],
  validate: (bundle: FileBundle) => {
    // Check if bundle contains TikTok-like files
    for (const [path, file] of bundle.files) {
      if (path.toLowerCase().includes('tiktok') || 
          (file.name.toLowerCase().includes('following') && file.type === 'text')) {
        return true;
      }
    }
    return false;
  }
};