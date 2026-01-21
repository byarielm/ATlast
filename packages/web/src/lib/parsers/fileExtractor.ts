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
    rules: ParseRule[]
  ): Promise<ExtractionResults> {
    /** Core logic for extracting usernames from a successfully loaded ZIP archive. */
    const allExtracted: Record<string, string[]> = {};
    const uniqueUsernames: Set<string> = new Set();

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const ruleId = `Rule_${i + 1}_${rule.zipPath}`;
      console.log(
        `Processing ZIP file path ${rule.zipPath} (Format: ${rule.format})`
      );

      // 1. Get file object from ZIP
      const fileInZip = zip.file(rule.zipPath);
      if (!fileInZip) {
        console.warn(
          `WARNING: File not found in ZIP: '${rule.zipPath}'. Skipping rule.`
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
 * Check if file is a ZIP by reading magic number
 */
async function checkIfZipFile(
  file: File | ArrayBuffer | Blob
): Promise<boolean> {
  try {
    const blob =
      file instanceof File || file instanceof Blob ? file : new Blob([file]);
    const header = await blob.slice(0, 4).arrayBuffer();
    const bytes = new Uint8Array(header);

    // ZIP magic numbers: PK (0x50 0x4B)
    return bytes[0] === 0x50 && bytes[1] === 0x4b;
  } catch (e) {
    return false;
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
  platform: string
): Promise<string[]> {
  const rules = getRulesForPlatform(platform);

  if (rules.length === 0) {
    console.error(`No parsing rules found for platform: ${platform}`);
    return [];
  }

  const isZipFile = await checkIfZipFile(file);

  if (isZipFile) {
    // 1. --- PROCESS AS ZIP ---
    try {
      console.log("Detected ZIP file, loading as archive...");
      const zip = await JSZip.loadAsync(file);

      const extractor = new DataExtractor(file);
      const results = await extractor.processZipArchive(zip, rules);

      console.log(
        `Successfully extracted ${results.uniqueUsernames.length} usernames from ZIP archive.`
      );
      return results.uniqueUsernames;
    } catch (e) {
      console.error("ZIP processing failed:", e);
      return [];
    }
  } else {
    // 2. --- PROCESS AS SINGLE FILE ---
    console.log("Processing as single file...");

    // We need a File object to get the name and content easily
    if (!(file instanceof File) && !(file instanceof Blob)) {
      console.error(
        "Input failed ZIP check and lacks a name/content structure for single file parsing (must be File or Blob)."
      );
      return [];
    }

    const singleFile = file as File;

    // Match rule based on file extension and format
    const fileExt = singleFile.name.split(".").pop()?.toLowerCase();

    const matchingRule = rules.find((rule) => {
      // Match based on format type and file extension
      if (rule.format === "TEXT" && fileExt === "txt") return true;
      if (rule.format === "JSON" && fileExt === "json") return true;
      if (rule.format === "HTML" && fileExt === "html") return true;

      // Fallback: check if filename ends with the expected filename from rule
      const ruleFilename = rule.zipPath.split("/").pop()?.toLowerCase();
      return singleFile.name.toLowerCase().endsWith(ruleFilename || "");
    });

    if (!matchingRule) {
      console.error(
        `Could not match single file '${singleFile.name}' (extension: ${fileExt}) to any rule for platform ${platform}. Available formats: ${rules.map((r) => r.format).join(", ")}`
      );
      return [];
    }

    console.log(
      `Matched single file '${singleFile.name}' to rule format: ${matchingRule.format}`
    );

    // 3. Process as single file content
    try {
      const content = await singleFile.text();
      const extracted = parseContent(content, matchingRule);

      const uniqueUsernames = Array.from(new Set(extracted)).sort();
      console.log(
        `Successfully extracted ${uniqueUsernames.length} unique usernames from single file.`
      );

      return uniqueUsernames;
    } catch (contentError) {
      console.error("Error reading content of single file:", contentError);
      return [];
    }
  }
}
