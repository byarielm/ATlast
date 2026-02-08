import { describe, it, expect } from "vitest";
import {
  PLATFORM_RULES,
  getRulesForPlatform,
} from "./platformDefinitions";
import type { ParseRule, FileFormat } from "./platformDefinitions";

describe("platformDefinitions", () => {
  describe("PLATFORM_RULES", () => {
    it("defines rules for instagram", () => {
      expect(PLATFORM_RULES.instagram).toBeDefined();
      expect(PLATFORM_RULES.instagram.length).toBeGreaterThan(0);
    });

    it("defines rules for tiktok", () => {
      expect(PLATFORM_RULES.tiktok).toBeDefined();
      expect(PLATFORM_RULES.tiktok.length).toBeGreaterThan(0);
    });

    it("instagram has HTML and JSON rules", () => {
      const formats = PLATFORM_RULES.instagram.map((r) => r.format);
      expect(formats).toContain("HTML");
      expect(formats).toContain("JSON");
    });

    it("tiktok has TEXT and JSON rules", () => {
      const formats = PLATFORM_RULES.tiktok.map((r) => r.format);
      expect(formats).toContain("TEXT");
      expect(formats).toContain("JSON");
    });

    it("every rule has required fields", () => {
      const validFormats: FileFormat[] = ["HTML", "TEXT", "JSON"];

      for (const [platform, rules] of Object.entries(PLATFORM_RULES)) {
        for (const rule of rules) {
          expect(rule.zipPath, `${platform} rule missing zipPath`).toBeTruthy();
          expect(
            validFormats.includes(rule.format),
            `${platform} rule has invalid format: ${rule.format}`,
          ).toBe(true);
          expect(rule.rule, `${platform} rule missing rule`).toBeDefined();
        }
      }
    });

    it("HTML/TEXT rules have string regex patterns", () => {
      for (const [platform, rules] of Object.entries(PLATFORM_RULES)) {
        for (const rule of rules) {
          if (rule.format === "HTML" || rule.format === "TEXT") {
            expect(
              typeof rule.rule,
              `${platform} ${rule.format} rule should have string regex`,
            ).toBe("string");
          }
        }
      }
    });

    it("JSON rules have array key paths", () => {
      for (const [platform, rules] of Object.entries(PLATFORM_RULES)) {
        for (const rule of rules) {
          if (rule.format === "JSON") {
            expect(
              Array.isArray(rule.rule),
              `${platform} JSON rule should have array key path`,
            ).toBe(true);
            expect(
              (rule.rule as string[]).length,
              `${platform} JSON rule key path should have at least 2 keys`,
            ).toBeGreaterThanOrEqual(2);
          }
        }
      }
    });
  });

  describe("getRulesForPlatform", () => {
    it("returns instagram rules for 'instagram'", () => {
      const rules = getRulesForPlatform("instagram");
      expect(rules).toEqual(PLATFORM_RULES.instagram);
    });

    it("returns tiktok rules for 'tiktok'", () => {
      const rules = getRulesForPlatform("tiktok");
      expect(rules).toEqual(PLATFORM_RULES.tiktok);
    });

    it("is case-insensitive", () => {
      expect(getRulesForPlatform("Instagram")).toEqual(
        getRulesForPlatform("instagram"),
      );
      expect(getRulesForPlatform("TIKTOK")).toEqual(
        getRulesForPlatform("tiktok"),
      );
    });

    it("returns empty array for unknown platform", () => {
      expect(getRulesForPlatform("unknown")).toEqual([]);
      expect(getRulesForPlatform("facebook")).toEqual([]);
    });

    it("returns empty array for empty string", () => {
      expect(getRulesForPlatform("")).toEqual([]);
    });
  });
});
