export interface SocialUser {
  username: string;
  date: string;
}

export interface FileBundle {
  files: Map<string, { name: string; content: string; type: 'text' | 'html' | 'json' }>;
  originalFileName: string;
}

export interface PlatformParser {
  name: string;
  parse: (bundle: FileBundle) => Promise<SocialUser[]>;
  canParse: (bundle: FileBundle) => boolean;
}

export interface PlatformConfig {
  id: string;
  name: string;
  parsers: PlatformParser[];
  expectedFiles: string[]; // File patterns to look for
  validate: (bundle: FileBundle) => boolean;
}

export class PlatformParseError extends Error {
  constructor(message: string, public platform: string) {
    super(message);
    this.name = 'PlatformParseError';
  }
}