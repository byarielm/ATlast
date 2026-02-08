import { describe, it, expect } from "vitest";
import { normalize } from "./string.utils";

describe("String Utils", () => {
  describe("normalize", () => {
    it("lowercases the string", () => {
      expect(normalize("UserName")).toBe("username");
      expect(normalize("ALLCAPS")).toBe("allcaps");
    });

    it("removes dots", () => {
      expect(normalize("user.name")).toBe("username");
      expect(normalize("a.b.c")).toBe("abc");
    });

    it("removes underscores", () => {
      expect(normalize("user_name")).toBe("username");
      expect(normalize("__leading")).toBe("leading");
    });

    it("removes hyphens", () => {
      expect(normalize("user-name")).toBe("username");
      expect(normalize("--dashes--")).toBe("dashes");
    });

    it("removes mixed separators", () => {
      expect(normalize("user.name_with-all")).toBe("usernamewithall");
    });

    it("lowercases and removes separators together", () => {
      expect(normalize("User.BSKY.social")).toBe("userbskysocial");
      expect(normalize("The_Real-Deal.99")).toBe("therealdeal99");
    });

    it("returns empty string for empty input", () => {
      expect(normalize("")).toBe("");
    });

    it("returns string unchanged when no separators present", () => {
      expect(normalize("already")).toBe("already");
    });

    it("preserves numbers", () => {
      expect(normalize("user123")).toBe("user123");
      expect(normalize("123.456")).toBe("123456");
    });

    it("preserves other special characters", () => {
      expect(normalize("user@domain")).toBe("user@domain");
      expect(normalize("hello world")).toBe("hello world");
    });
  });
});
