import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  createArraySchema,
  ValidationSchemas,
  validateInput,
  validateArrayInput,
} from "./validation.utils";
import { ValidationError } from "../errors";

describe("Validation Utils", () => {
  describe("createArraySchema", () => {
    it("creates schema that accepts valid arrays", () => {
      const schema = createArraySchema(z.string(), 5, "tags");
      const result = schema.safeParse(["a", "b", "c"]);
      expect(result.success).toBe(true);
    });

    it("rejects empty arrays", () => {
      const schema = createArraySchema(z.string(), 5, "tags");
      const result = schema.safeParse([]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "tags array is required and must not be empty",
        );
      }
    });

    it("rejects arrays over max length", () => {
      const schema = createArraySchema(z.string(), 3, "items");
      const result = schema.safeParse(["a", "b", "c", "d"]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "Maximum 3 items per batch",
        );
      }
    });

    it("rejects items that dont match item schema", () => {
      const schema = createArraySchema(z.number(), 5, "numbers");
      const result = schema.safeParse(["not-a-number"]);
      expect(result.success).toBe(false);
    });

    it("uses default field name when not provided", () => {
      const schema = createArraySchema(z.string(), 5);
      const result = schema.safeParse([]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("items");
      }
    });

    it("accepts single-element arrays", () => {
      const schema = createArraySchema(z.string(), 5, "tags");
      const result = schema.safeParse(["only-one"]);
      expect(result.success).toBe(true);
    });

    it("accepts arrays at exactly max length", () => {
      const schema = createArraySchema(z.string(), 3, "tags");
      const result = schema.safeParse(["a", "b", "c"]);
      expect(result.success).toBe(true);
    });
  });

  describe("ValidationSchemas", () => {
    describe("didsArray", () => {
      it("accepts valid DID arrays (up to 100)", () => {
        const result = ValidationSchemas.didsArray.safeParse([
          "did:plc:abc123",
          "did:web:example.com",
        ]);
        expect(result.success).toBe(true);
      });

      it("rejects empty arrays", () => {
        const result = ValidationSchemas.didsArray.safeParse([]);
        expect(result.success).toBe(false);
      });

      it("rejects arrays over 100 items", () => {
        const tooMany = Array.from({ length: 101 }, (_, i) => `did:plc:${i}`);
        const result = ValidationSchemas.didsArray.safeParse(tooMany);
        expect(result.success).toBe(false);
      });
    });

    describe("usernamesArray", () => {
      it("accepts valid username arrays (up to 50)", () => {
        const result = ValidationSchemas.usernamesArray.safeParse([
          "user1",
          "user2",
        ]);
        expect(result.success).toBe(true);
      });

      it("rejects arrays over 50 items", () => {
        const tooMany = Array.from({ length: 51 }, (_, i) => `user${i}`);
        const result = ValidationSchemas.usernamesArray.safeParse(tooMany);
        expect(result.success).toBe(false);
      });
    });

    describe("stringArray", () => {
      it("creates array schema with custom max", () => {
        const schema = ValidationSchemas.stringArray(10, "tags");
        const result = schema.safeParse(["a", "b"]);
        expect(result.success).toBe(true);
      });

      it("enforces custom max length", () => {
        const schema = ValidationSchemas.stringArray(2, "tags");
        const result = schema.safeParse(["a", "b", "c"]);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("validateInput", () => {
    it("returns parsed data for valid input", () => {
      const schema = z.object({ name: z.string() });
      const result = validateInput(schema, { name: "test" });
      expect(result).toEqual({ name: "test" });
    });

    it("throws ValidationError for invalid input", () => {
      const schema = z.object({ name: z.string() });
      expect(() => validateInput(schema, { name: 123 })).toThrow(
        ValidationError,
      );
    });

    it("provides first error message in ValidationError", () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      try {
        validateInput(schema, { name: 123, age: "not-a-number" });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toBeTruthy();
      }
    });

    it("strips extra fields with Zod strict mode", () => {
      const schema = z.object({ name: z.string() });
      // Default Zod strips extra fields
      const result = validateInput(schema, {
        name: "test",
        extra: "field",
      });
      expect(result).toEqual({ name: "test" });
    });

    it("validates primitive types", () => {
      expect(validateInput(z.string(), "hello")).toBe("hello");
      expect(validateInput(z.number(), 42)).toBe(42);
      expect(validateInput(z.boolean(), true)).toBe(true);
    });

    it("throws ValidationError for null when not nullable", () => {
      const schema = z.string();
      expect(() => validateInput(schema, null)).toThrow(ValidationError);
    });
  });

  describe("validateArrayInput", () => {
    const schema = ValidationSchemas.usernamesArray;

    it("parses body JSON and validates the named field", () => {
      const body = JSON.stringify({ usernames: ["user1", "user2"] });
      const result = validateArrayInput<string>(body, "usernames", schema);
      expect(result).toEqual(["user1", "user2"]);
    });

    it("throws ValidationError when field is missing", () => {
      const body = JSON.stringify({ other: ["value"] });
      expect(() => validateArrayInput<string>(body, "usernames", schema)).toThrow(
        ValidationError,
      );
    });

    it("throws SyntaxError for invalid JSON body", () => {
      expect(() =>
        validateArrayInput<string>("not-json", "usernames", schema),
      ).toThrow(SyntaxError);
    });

    it("uses empty object for null body", () => {
      expect(() =>
        validateArrayInput<string>(null, "usernames", schema),
      ).toThrow(ValidationError);
    });

    it("validates array constraints from schema", () => {
      const tooMany = Array.from({ length: 51 }, (_, i) => `user${i}`);
      const body = JSON.stringify({ usernames: tooMany });
      expect(() =>
        validateArrayInput<string>(body, "usernames", schema),
      ).toThrow(ValidationError);
    });
  });
});
