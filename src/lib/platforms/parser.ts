import JSZip from "jszip";
import type { FileBundle, SocialUser } from './types';
import { PlatformParseError } from './types';
import { getPlatform } from './registry';

// Convert a file into a FileBundle (extract ZIP if needed)
async function createBundle(file: File): Promise<FileBundle> {
  const bundle: FileBundle = {
    files: new Map(),
    originalFileName: file.name
  };

  if (file.name.endsWith('.zip')) {
    // Extract ZIP contents
    const zip = await JSZip.loadAsync(file);
    
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue; // Skip directories
      
      const content = await zipEntry.async('string');
      const fileName = path.split('/').pop() || path;
      
      // Determine file type
      let type: 'text' | 'html' | 'json' = 'text';
      if (fileName.endsWith('.html')) type = 'html';
      else if (fileName.endsWith('.json')) type = 'json';
      else if (fileName.endsWith('.txt')) type = 'text';
      
      bundle.files.set(path, {
        name: fileName,
        content,
        type
      });
    }
  } else {
    // Single file
    const content = await file.text();
    let type: 'text' | 'html' | 'json' = 'text';
    
    if (file.name.endsWith('.html')) type = 'html';
    else if (file.name.endsWith('.json')) type = 'json';
    else if (file.name.endsWith('.txt')) type = 'text';
    
    bundle.files.set(file.name, {
      name: file.name,
      content,
      type
    });
  }

  return bundle;
}

/**
 * Parse a file for a specific platform
 */
export async function parseFile(file: File, platformId: string): Promise<SocialUser[]> {
  // Get platform config
  const platform = getPlatform(platformId);
  if (!platform) {
    throw new PlatformParseError(
      `Platform '${platformId}' is not supported`,
      platformId
    );
  }

  // Create file bundle
  const bundle = await createBundle(file);

  if (bundle.files.size === 0) {
    throw new PlatformParseError(
      'No files found in upload',
      platformId
    );
  }

  // Validate bundle contains expected files (optional check)
  if (!platform.validate(bundle)) {
    const expectedFiles = platform.expectedFiles.join(', ');
    throw new PlatformParseError(
      `File doesn't appear to be ${platform.name} data. Expected files like: ${expectedFiles}`,
      platformId
    );
  }

  // Try each parser in order
  const errors: string[] = [];
  
  for (const parser of platform.parsers) {
    if (!parser.canParse(bundle)) {
      continue; // Skip parsers that can't handle this bundle
    }
    
    try {
      const users = await parser.parse(bundle);
      
      if (users.length === 0) {
        errors.push(`${parser.name}: No users found`);
        continue;
      }
      
      console.log(`Successfully parsed ${users.length} users using ${parser.name}`);
      return users;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${parser.name}: ${errorMsg}`);
      console.warn(`${parser.name} failed:`, errorMsg);
    }
  }

  // All parsers failed
  throw new PlatformParseError(
    `Could not parse ${platform.name} data. Tried: ${errors.join('; ')}`,
    platformId
  );
}

// Export for backwards compatibility
export { PlatformParseError } from './types';
export type { SocialUser } from './types';