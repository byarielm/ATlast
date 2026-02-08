import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { DataExtractor } from "./fileExtractor";
import type { ParseRule } from "./platformDefinitions";

/** Helper: creates a JSZip instance with files at given paths */
async function createTestZip(
  files: Record<string, string>,
): Promise<JSZip> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }
  return zip;
}

describe("DataExtractor", () => {
  describe("processZipArchive", () => {
    it("extracts usernames from Instagram HTML in ZIP", async () => {
      const htmlContent = `
        <a target="_blank" href="https://www.instagram.com/_u/user_one">user_one</a>
        <a target="_blank" href="https://www.instagram.com/_u/user_two">user_two</a>
      `;
      const zip = await createTestZip({
        "connections/followers_and_following/following.html": htmlContent,
      });

      const rules: ParseRule[] = [
        {
          zipPath: "connections/followers_and_following/following.html",
          format: "HTML",
          rule: '<a target="_blank" href="https://www.instagram.com/_u/([^"]+)"',
        },
      ];

      const extractor = new DataExtractor(new Blob());
      const results = await extractor.processZipArchive(zip, rules);

      expect(results.uniqueUsernames).toEqual(["user_one", "user_two"]);
    });

    it("extracts usernames from Instagram JSON in ZIP", async () => {
      const jsonContent = JSON.stringify({
        relationships_following: [
          { title: "alice" },
          { title: "bob" },
          { title: "charlie" },
        ],
      });
      const zip = await createTestZip({
        "connections/followers_and_following/following.json": jsonContent,
      });

      const rules: ParseRule[] = [
        {
          zipPath: "connections/followers_and_following/following.json",
          format: "JSON",
          rule: ["relationships_following", "title"],
        },
      ];

      const extractor = new DataExtractor(new Blob());
      const results = await extractor.processZipArchive(zip, rules);

      expect(results.uniqueUsernames).toEqual(["alice", "bob", "charlie"]);
    });

    it("extracts usernames from TikTok JSON in ZIP", async () => {
      const jsonContent = JSON.stringify({
        "Your Activity": {
          Following: {
            Following: [
              { UserName: "tiktoker1" },
              { UserName: "tiktoker2" },
            ],
          },
        },
      });
      const zip = await createTestZip({
        "user_data_tiktok.json": jsonContent,
      });

      const rules: ParseRule[] = [
        {
          zipPath: "user_data_tiktok.json",
          format: "JSON",
          rule: ["Your Activity", "Following", "Following", "UserName"],
        },
      ];

      const extractor = new DataExtractor(new Blob());
      const results = await extractor.processZipArchive(zip, rules);

      expect(results.uniqueUsernames).toEqual(["tiktoker1", "tiktoker2"]);
    });

    it("skips rules where ZIP file is not found", async () => {
      const zip = await createTestZip({
        "other/file.txt": "content",
      });

      const rules: ParseRule[] = [
        {
          zipPath: "missing/file.html",
          format: "HTML",
          rule: "(.+)",
        },
      ];

      const extractor = new DataExtractor(new Blob());
      const results = await extractor.processZipArchive(zip, rules);

      expect(results.uniqueUsernames).toEqual([]);
      expect(Object.keys(results.allExtracted)).toHaveLength(0);
    });

    it("deduplicates usernames across multiple rules", async () => {
      const htmlContent = `
        <a target="_blank" href="https://www.instagram.com/_u/overlap_user">overlap_user</a>
        <a target="_blank" href="https://www.instagram.com/_u/html_only">html_only</a>
      `;
      const jsonContent = JSON.stringify({
        relationships_following: [
          { title: "overlap_user" },
          { title: "json_only" },
        ],
      });

      const zip = await createTestZip({
        "connections/followers_and_following/following.html": htmlContent,
        "connections/followers_and_following/following.json": jsonContent,
      });

      const rules: ParseRule[] = [
        {
          zipPath: "connections/followers_and_following/following.html",
          format: "HTML",
          rule: '<a target="_blank" href="https://www.instagram.com/_u/([^"]+)"',
        },
        {
          zipPath: "connections/followers_and_following/following.json",
          format: "JSON",
          rule: ["relationships_following", "title"],
        },
      ];

      const extractor = new DataExtractor(new Blob());
      const results = await extractor.processZipArchive(zip, rules);

      // Should be sorted and deduplicated
      expect(results.uniqueUsernames).toEqual([
        "html_only",
        "json_only",
        "overlap_user",
      ]);
    });

    it("returns sorted unique usernames", async () => {
      const jsonContent = JSON.stringify({
        users: [
          { name: "charlie" },
          { name: "alice" },
          { name: "bob" },
        ],
      });
      const zip = await createTestZip({
        "data.json": jsonContent,
      });

      const rules: ParseRule[] = [
        {
          zipPath: "data.json",
          format: "JSON",
          rule: ["users", "name"],
        },
      ];

      const extractor = new DataExtractor(new Blob());
      const results = await extractor.processZipArchive(zip, rules);

      expect(results.uniqueUsernames).toEqual(["alice", "bob", "charlie"]);
    });

    it("stores results keyed by rule ID", async () => {
      const jsonContent = JSON.stringify({
        users: [{ name: "user1" }],
      });
      const zip = await createTestZip({
        "data.json": jsonContent,
      });

      const rules: ParseRule[] = [
        {
          zipPath: "data.json",
          format: "JSON",
          rule: ["users", "name"],
        },
      ];

      const extractor = new DataExtractor(new Blob());
      const results = await extractor.processZipArchive(zip, rules);

      expect(results.allExtracted["Rule_1_data.json"]).toEqual(["user1"]);
    });

    it("handles empty ZIP gracefully", async () => {
      const zip = new JSZip();
      const rules: ParseRule[] = [
        {
          zipPath: "missing.json",
          format: "JSON",
          rule: ["users", "name"],
        },
      ];

      const extractor = new DataExtractor(new Blob());
      const results = await extractor.processZipArchive(zip, rules);

      expect(results.uniqueUsernames).toEqual([]);
    });

    it("handles empty rules array", async () => {
      const zip = await createTestZip({ "file.txt": "data" });

      const extractor = new DataExtractor(new Blob());
      const results = await extractor.processZipArchive(zip, []);

      expect(results.uniqueUsernames).toEqual([]);
      expect(Object.keys(results.allExtracted)).toHaveLength(0);
    });
  });
});
