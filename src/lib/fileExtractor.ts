import JSZip from "jszip";
import { ParseRule, getRulesForPlatform } from "./platformDefinitions";
import { parseContent } from "./parserLogic";

// Type for the final aggregated results
export interface ExtractionResults {
  allExtracted: Record<string, string[]>;
  uniqueUsernames: string[];
}

export class DataExtractor {
  private file: File | ArrayBuffer | Blob;

  constructor(file: File | ArrayBuffer | Blob) {
    this.file = file;
  }

  public async processZipArchive(
    zip: JSZip,
    rules: ParseRule[],
  ): Promise<ExtractionResults> {
    /** Core logic for extracting usernames from a successfully loaded ZIP archive. */
    const allExtracted: Record<string, string[]> = {};
    const uniqueUsernames: Set<string> = new Set();

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const ruleId = `Rule_${i + 1}_${rule.zipPath}`;
      console.log(
        `Processing ZIP file path ${rule.zipPath} (Format: ${rule.format})`,
      );

      // 1. Get file object from ZIP
      const fileInZip = zip.file(rule.zipPath);
      if (!fileInZip) {
        console.warn(
          `WARNING: File not found in ZIP: '${rule.zipPath}'. Skipping rule.`,
        );
        continue;
      }

      try {
        // 2. Read content asynchronously
        const content = await fileInZip.async("string");

        // 3. Apply appropriate parsing logic
        const extracted = parseContent(content, rule);

        // 4. Store results
        allExtracted[ruleId] = extracted;
        extracted.forEach((name) => uniqueUsernames.add(name));
      } catch (e) {
        console.error(`ERROR reading file ${rule.zipPath} from ZIP:`, e);
      }
    }

    return {
      allExtracted,
      uniqueUsernames: Array.from(uniqueUsernames).sort(),
    };
  }
}

/**
 * Public facing function handling both ZIP and single files.
 * @param file A File object (or ArrayBuffer/Blob) representing the uploaded data.
 * @param platform The platform name (e.g., 'instagram', 'tiktok').
 * @returns A promise that resolves to an array of unique usernames (string[]).
 */
export async function parseDataFile(
  file: File | ArrayBuffer | Blob,
  platform: string,
): Promise<string[]> {
  const rules = getRulesForPlatform(platform);

  if (rules.length === 0) {
    console.error(`No parsing rules found for platform: ${platform}`);
    return [];
  }

  // 1. --- ATTEMPT ZIP LOAD ---
  try {
    console.log("Attempting to load file as ZIP archive...");
    const zip = await JSZip.loadAsync(file);

    const extractor = new DataExtractor(file);
    const results = await extractor.processZipArchive(zip, rules);

    console.log(
      `Successfully extracted ${results.uniqueUsernames.length} usernames from ZIP archive.`,
    );
    return results.uniqueUsernames;
  } catch (e) {
    // 2. --- ZIP LOAD FAILED, ATTEMPT SINGLE FILE ---
    console.warn(
      "ZIP load failed. Attempting to parse file as a single data file...",
    );

    // We need a File object to get the name and content easily
    if (!(file instanceof File) && !(file instanceof Blob)) {
      console.error(
        "Input failed ZIP check and lacks a name/content structure for single file parsing (must be File or Blob).",
      );
      return [];
    }

    const singleFile = file as File;

    // Find the rule that matches the uploaded file name
    // We check if the uploaded filename ends with the final part of a rule's zipPath (e.g., "following.html")
    const matchingRule = rules.find((rule) =>
      singleFile.name
        .toLowerCase()
        .endsWith((rule.zipPath.split("/").pop() || "").toLowerCase()),
    );

    if (!matchingRule) {
      console.error(
        `Could not match single file '${singleFile.name}' to any rule for platform ${platform}. Check rules in platformDefinitions.ts.`,
      );
      return [];
    }

    console.log(
      `Matched single file '${singleFile.name}' to rule: ${matchingRule.zipPath}`,
    );

    // 3. Process as single file content
    try {
      const content = await singleFile.text();
      const extracted = parseContent(content, matchingRule);

      const uniqueUsernames = Array.from(new Set(extracted)).sort();
      console.log(
        `Successfully extracted ${uniqueUsernames.length} unique usernames from single file.`,
      );

      return uniqueUsernames;
    } catch (contentError) {
      console.error("Error reading content of single file:", contentError);
      return [];
    }
  }
}
