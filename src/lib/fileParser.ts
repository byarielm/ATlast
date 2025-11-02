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

  async parseInstagramHtmlFile(htmlText: string): Promise<TikTokUser[]> {
    const users: TikTokUser[] = [];
    
    // Parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    
    // Instagram following data is in divs with class "_a6-g uiBoxWhite noborder"
    // The username is in an h2 with class "_a6-h _a6-i"
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
    
    return users;
  },

  async parseInstagramJsonFile(jsonText: string): Promise<TikTokUser[]> {
    const users: TikTokUser[] = [];
    const jsonData = JSON.parse(jsonText);
    
    // Instagram JSON exports can have different structures
    // Try the most common structure first
    let followingArray = jsonData?.relationships_following;
    
    if (!followingArray && jsonData?.following) {
      followingArray = jsonData.following;
    }
    
    if (!Array.isArray(followingArray)) {
      throw new FileParseError(
        "Could not find following data in Instagram JSON file"
      );
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
    
    return users;
  },

  async parseZipFile(file: File): Promise<TikTokUser[]> {
    const zip = await JSZip.loadAsync(file);

    // Try TikTok first
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

    // Try Instagram HTML
    const instagramFollowingHtml = Object.values(zip.files).find(
      (f) => f.name.includes("following") && f.name.endsWith(".html") && !f.dir
    );
    
    if (instagramFollowingHtml) {
      const htmlText = await instagramFollowingHtml.async("string");
      return this.parseInstagramHtmlFile(htmlText);
    }

    // Try Instagram JSON
    const instagramJsonFile = Object.values(zip.files).find(
      (f) => (f.name.includes("following") || f.name.includes("connections")) && 
            f.name.endsWith(".json") && !f.dir
    );
    
    if (instagramJsonFile) {
      const jsonText = await instagramJsonFile.async("string");
      return this.parseInstagramJsonFile(jsonText);
    }

    // If no specific file found, look for any JSON at the top level
    const jsonFileEntry = Object.values(zip.files).find(
      (f) => f.name.endsWith(".json") && !f.dir
    );

    if (!jsonFileEntry) {
      throw new FileParseError(
        "Could not find following data in the ZIP archive. Please ensure it contains Instagram's following.html or connections.json file."
      );
    }

    const jsonText = await jsonFileEntry.async("string");
    
    // Try Instagram JSON format first
    try {
      return this.parseInstagramJsonFile(jsonText);
    } catch {
      // Fall back to TikTok JSON format
      return this.parseJsonFile(jsonText);
    }
  },

  async parseFile(file: File): Promise<TikTokUser[]> {
    let users: TikTokUser[];
    let sourceFile = file.name;
    
    if (file.name.endsWith(".json")) {
      users = await this.parseJsonFile(await file.text());
    } else if (file.name.endsWith(".txt")) {
      users = await this.parseTxtFile(await file.text());
    } else if (file.name.endsWith(".zip")) {
      users = await this.parseZipFile(file);
      // Determine which file was actually used from the ZIP
      const zip = await JSZip.loadAsync(file);
      const followingFile = zip.file("TikTok/Profile and Settings/Following.txt") ||
        zip.file("Profile and Settings/Following.txt") ||
        zip.files[Object.keys(zip.files).find(path => path.endsWith("Following.txt") && path.includes("Profile")) || ""];
      
      if (followingFile) {
        sourceFile = `${file.name} (TikTok Following.txt)`;
      } else {
        const instagramFollowingHtml = Object.values(zip.files).find(
          (f) => f.name.includes("following") && f.name.endsWith(".html") && !f.dir
        );
        if (instagramFollowingHtml) {
          sourceFile = `${file.name} (Instagram ${instagramFollowingHtml.name})`;
        } else {
          const instagramJsonFile = Object.values(zip.files).find(
            (f) => (f.name.includes("following") || f.name.includes("connections")) && 
                  f.name.endsWith(".json") && !f.dir
          );
          if (instagramJsonFile) {
            sourceFile = `${file.name} (Instagram ${instagramJsonFile.name})`;
          }
        }
      }
    } else if (file.name.endsWith(".html")) {
      users = await this.parseInstagramHtmlFile(await file.text());
    } else {
      throw new FileParseError("Please upload a .txt, .json, .html, or .zip file");
    }
    
    console.log(`Parsed ${users.length} users from: ${sourceFile}`);
    return users;
  }
};