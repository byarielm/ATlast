import { describe, it, expect } from "vitest";
import { parseTextOrHtml, parseJson, parseContent } from "./parserLogic";
import type { ParseRule } from "./platformDefinitions";

describe("parserLogic", () => {
  describe("parseTextOrHtml", () => {
    it("extracts usernames from Instagram HTML", () => {
      const html = `
        <a target="_blank" href="https://www.instagram.com/_u/beautyscicomm">beautyscicomm</a>
        <a target="_blank" href="https://www.instagram.com/_u/techguru42">techguru42</a>
      `;
      const regex =
        '<a target="_blank" href="https://www.instagram.com/_u/([^"]+)"';

      const result = parseTextOrHtml(html, regex);

      expect(result).toEqual(["beautyscicomm", "techguru42"]);
    });

    it("extracts usernames from TikTok text format", () => {
      const text = `Date: 2024-01-01
Username: user_one
Date: 2024-01-02
Username: user_two`;
      const regex = "Username:\\s*([^\\r\\n]+)";

      const result = parseTextOrHtml(text, regex);

      expect(result).toEqual(["user_one", "user_two"]);
    });

    it("returns empty array when no matches found", () => {
      const result = parseTextOrHtml("no matches here", "Username:\\s*(.+)");
      expect(result).toEqual([]);
    });

    it("returns empty array for invalid regex pattern", () => {
      const result = parseTextOrHtml("content", "[invalid(regex");
      expect(result).toEqual([]);
    });

    it("filters out empty captured groups", () => {
      // Pattern that could match empty groups
      const content = "prefix: \nprefix: value";
      const regex = "prefix:\\s*(.*)";

      const result = parseTextOrHtml(content, regex);
      // Both match, but first capture is empty string which gets filtered
      expect(result.every((r) => r.length > 0)).toBe(true);
    });

    it("trims whitespace from extracted usernames", () => {
      const text = "Username:   spacey_user   ";
      const regex = "Username:\\s*([^\\r\\n]+)";

      const result = parseTextOrHtml(text, regex);

      expect(result).toEqual(["spacey_user"]);
    });
  });

  describe("parseJson", () => {
    it("extracts usernames from Instagram JSON format", () => {
      const content = JSON.stringify({
        relationships_following: [
          { title: "user1" },
          { title: "user2" },
          { title: "user3" },
        ],
      });

      const result = parseJson(content, [
        "relationships_following",
        "title",
      ]);

      expect(result).toEqual(["user1", "user2", "user3"]);
    });

    it("extracts usernames from TikTok nested JSON format", () => {
      const content = JSON.stringify({
        "Your Activity": {
          Following: {
            Following: [
              { UserName: "tiktoker1" },
              { UserName: "tiktoker2" },
            ],
          },
        },
      });

      const result = parseJson(content, [
        "Your Activity",
        "Following",
        "Following",
        "UserName",
      ]);

      expect(result).toEqual(["tiktoker1", "tiktoker2"]);
    });

    it("returns empty array for empty JSON object", () => {
      const result = parseJson("{}", ["relationships_following", "title"]);
      expect(result).toEqual([]);
    });

    it("returns empty array for invalid JSON", () => {
      const result = parseJson("not-json", ["key", "value"]);
      expect(result).toEqual([]);
    });

    it("returns empty array when path key is not found", () => {
      const content = JSON.stringify({ other: [] });
      const result = parseJson(content, ["missing_key", "title"]);
      expect(result).toEqual([]);
    });

    it("returns empty array when path keys are less than 2", () => {
      const content = JSON.stringify({ key: "value" });
      const result = parseJson(content, ["key"]);
      expect(result).toEqual([]);
    });

    it("returns empty array when target array is not an array", () => {
      const content = JSON.stringify({
        container: { list: "not-an-array" },
      });
      const result = parseJson(content, ["container", "list", "name"]);
      expect(result).toEqual([]);
    });

    it("skips items missing the target key", () => {
      const content = JSON.stringify({
        users: [
          { name: "user1" },
          { other: "no-name" },
          { name: "user3" },
        ],
      });

      const result = parseJson(content, ["users", "name"]);

      expect(result).toEqual(["user1", "user3"]);
    });

    it("converts non-string values to string", () => {
      const content = JSON.stringify({
        items: [{ id: 123 }, { id: 456 }],
      });

      const result = parseJson(content, ["items", "id"]);

      expect(result).toEqual(["123", "456"]);
    });

    it("handles deeply nested navigation path", () => {
      const content = JSON.stringify({
        level1: {
          level2: {
            items: [{ name: "deep" }],
          },
        },
      });

      const result = parseJson(content, [
        "level1",
        "level2",
        "items",
        "name",
      ]);

      expect(result).toEqual(["deep"]);
    });
  });

  describe("parseContent", () => {
    it("dispatches HTML format to parseTextOrHtml", () => {
      const rule: ParseRule = {
        zipPath: "test.html",
        format: "HTML",
        rule: '<a href="([^"]+)"',
      };
      const content = '<a href="username1">';

      const result = parseContent(content, rule);

      expect(result).toEqual(["username1"]);
    });

    it("dispatches TEXT format to parseTextOrHtml", () => {
      const rule: ParseRule = {
        zipPath: "test.txt",
        format: "TEXT",
        rule: "Name: (.+)",
      };
      const content = "Name: testuser";

      const result = parseContent(content, rule);

      expect(result).toEqual(["testuser"]);
    });

    it("dispatches JSON format to parseJson", () => {
      const rule: ParseRule = {
        zipPath: "test.json",
        format: "JSON",
        rule: ["users", "name"],
      };
      const content = JSON.stringify({
        users: [{ name: "jsonuser" }],
      });

      const result = parseContent(content, rule);

      expect(result).toEqual(["jsonuser"]);
    });

    it("returns empty array for HTML rule with array path (wrong type)", () => {
      const rule: ParseRule = {
        zipPath: "test.html",
        format: "HTML",
        rule: ["should", "be", "string"],
      };

      const result = parseContent("content", rule);

      expect(result).toEqual([]);
    });

    it("returns empty array for JSON rule with string regex (wrong type)", () => {
      const rule: ParseRule = {
        zipPath: "test.json",
        format: "JSON",
        rule: "should-be-array",
      };

      const result = parseContent("content", rule);

      expect(result).toEqual([]);
    });
  });
});
