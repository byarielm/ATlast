// src/lib/platforms/instagram.ts

import type { PlatformConfig, PlatformParser, FileBundle, SocialUser } from './types';
import { PlatformParseError } from './types';

// HTML Parser for Instagram following.html
const htmlParser: PlatformParser = {
  name: 'Instagram HTML',
  canParse: (bundle: FileBundle) => {
    for (const [_, file] of bundle.files) {
      if (file.type === 'html' && file.name.toLowerCase().includes('following')) {
        return file.content.includes('_a6-g') || file.content.includes('uiBoxWhite');
      }
    }
    return false;
  },
  parse: async (bundle: FileBundle) => {
    const users: SocialUser[] = [];
    
    // Find HTML file
    let htmlContent = '';
    for (const [_, file] of bundle.files) {
      if (file.type === 'html' && file.name.toLowerCase().includes('following')) {
        htmlContent = file.content;
        break;
      }
    }
    
    if (!htmlContent) {
      throw new PlatformParseError('No Instagram following.html file found', 'instagram');
    }
    
    // Parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Instagram following data is in specific divs
    const userDivs = doc.querySelectorAll('div.pam._3-95._2ph-._a6-g.uiBoxWhite.noborder');
    
    userDivs.forEach((div) => {
      const h2 = div.querySelector('h2._3-95._2pim._a6-h._a6-i');
      const dateDiv = div.querySelector('div._a6-p > div > div:nth-child(2)');
      
      if (h2) {
        const username = h2.textContent?.trim();
        const date = dateDiv?.textContent?.trim() || '';
        
        if (username) {
          users.push({
            username: username,
            date: date
          });
        }
      }
    });
    
    if (users.length === 0) {
      throw new PlatformParseError(
        'No following data found in Instagram HTML file',
        'instagram'
      );
    }
    
    return users;
  }
};

// JSON Parser for Instagram JSON exports
const jsonParser: PlatformParser = {
  name: 'Instagram JSON',
  canParse: (bundle: FileBundle) => {
    for (const [_, file] of bundle.files) {
      if (file.type === 'json') {
        try {
          const data = JSON.parse(file.content);
          return !!(data?.relationships_following || data?.following);
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
          
          // Instagram JSON exports can have different structures
          let followingArray = jsonData?.relationships_following;
          
          if (!followingArray && jsonData?.following) {
            followingArray = jsonData.following;
          }
          
          if (!Array.isArray(followingArray)) {
            continue;
          }
          
          for (const entry of followingArray) {
            const username = entry.string_list_data?.[0]?.value || entry.username || entry.handle;
            const timestamp = entry.string_list_data?.[0]?.timestamp || entry.timestamp;
            
            if (username) {
              users.push({
                username: username,
                date: timestamp ? new Date(timestamp * 1000).toISOString() : ''
              });
            }
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
      'No valid Instagram JSON data found. Expected relationships_following or following array',
      'instagram'
    );
  }
};

// Instagram Platform Configuration
export const instagramPlatform: PlatformConfig = {
  id: 'instagram',
  name: 'Instagram',
  parsers: [htmlParser, jsonParser], // Try HTML first (most common)
  expectedFiles: ['following.html', 'connections.json', 'followers_and_following.json'],
  validate: (bundle: FileBundle) => {
    // Check if bundle contains Instagram-like files
    for (const [path, file] of bundle.files) {
      if (path.toLowerCase().includes('instagram') ||
          path.toLowerCase().includes('connections') ||
          (file.name.toLowerCase().includes('following') && file.type === 'html')) {
        return true;
      }
    }
    return false;
  }
};