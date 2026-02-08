import { describe, it, expect, vi } from "vitest";
import type { Agent } from "@atproto/api";
import { FollowService } from "./FollowService";
import { createMockAgent } from "../../__tests__/fixtures";
import type { MockFollowRecord } from "../../__tests__/fixtures";

/** Helper to build follow records for a list of DIDs */
function buildFollowRecords(dids: string[]): MockFollowRecord[] {
  return dids.map((did) => ({
    uri: `at://did:plc:self/app.bsky.graph.follow/${did}`,
    cid: "mock-cid",
    value: { subject: did, createdAt: new Date().toISOString() },
  }));
}

describe("FollowService", () => {
  describe("checkFollowStatus", () => {
    it("returns all false for empty DID array", async () => {
      const agent = createMockAgent();
      const result = await FollowService.checkFollowStatus(
        agent,
        "did:plc:self",
        [],
      );
      expect(result).toEqual({});
    });

    it("returns all false when no follows exist", async () => {
      const agent = createMockAgent({
        listRecords: async () => ({
          data: { records: [], cursor: undefined },
        }),
      });

      const result = await FollowService.checkFollowStatus(
        agent,
        "did:plc:self",
        ["did:plc:user1", "did:plc:user2"],
      );

      expect(result).toEqual({
        "did:plc:user1": false,
        "did:plc:user2": false,
      });
    });

    it("detects followed DIDs from records", async () => {
      const records = buildFollowRecords(["did:plc:user1", "did:plc:user3"]);
      const agent = createMockAgent({
        listRecords: async () => ({
          data: { records, cursor: undefined },
        }),
      });

      const result = await FollowService.checkFollowStatus(
        agent,
        "did:plc:self",
        ["did:plc:user1", "did:plc:user2", "did:plc:user3"],
      );

      expect(result).toEqual({
        "did:plc:user1": true,
        "did:plc:user2": false,
        "did:plc:user3": true,
      });
    });

    it("handles pagination with cursor", async () => {
      let callCount = 0;
      const agent = createMockAgent({
        listRecords: async () => {
          callCount++;
          if (callCount === 1) {
            return {
              data: {
                records: buildFollowRecords(["did:plc:user1"]),
                cursor: "page2",
              },
            };
          }
          return {
            data: {
              records: buildFollowRecords(["did:plc:user2"]),
              cursor: undefined,
            },
          };
        },
      });

      const result = await FollowService.checkFollowStatus(
        agent,
        "did:plc:self",
        ["did:plc:user1", "did:plc:user2"],
      );

      expect(result).toEqual({
        "did:plc:user1": true,
        "did:plc:user2": true,
      });
      expect(callCount).toBe(2);
    });

    it("stops early when all DIDs are found", async () => {
      let callCount = 0;
      const agent = createMockAgent({
        listRecords: async () => {
          callCount++;
          return {
            data: {
              records: buildFollowRecords(["did:plc:user1"]),
              cursor: "more",
            },
          };
        },
      });

      const result = await FollowService.checkFollowStatus(
        agent,
        "did:plc:self",
        ["did:plc:user1"],
      );

      expect(result["did:plc:user1"]).toBe(true);
      expect(callCount).toBe(1); // Should stop after finding all DIDs
    });

    it("returns all false on API error (fail-safe)", async () => {
      const agent = createMockAgent({
        listRecords: async () => {
          throw new Error("Network error");
        },
      });

      const errorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const result = await FollowService.checkFollowStatus(
        agent,
        "did:plc:self",
        ["did:plc:user1", "did:plc:user2"],
      );

      expect(result).toEqual({
        "did:plc:user1": false,
        "did:plc:user2": false,
      });
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it("handles records without subject field", async () => {
      const agent = createMockAgent({
        listRecords: async () => ({
          data: {
            records: [
              {
                uri: "at://did:plc:self/app.bsky.graph.follow/1",
                cid: "mock-cid",
                value: { createdAt: new Date().toISOString() },
              } as MockFollowRecord,
            ],
            cursor: undefined,
          },
        }),
      });

      const result = await FollowService.checkFollowStatus(
        agent,
        "did:plc:self",
        ["did:plc:user1"],
      );

      expect(result["did:plc:user1"]).toBe(false);
    });

    it("passes correct parameters to listRecords", async () => {
      const listRecordsFn = vi.fn().mockResolvedValue({
        data: { records: [], cursor: undefined },
      });
      const agent = createMockAgent({ listRecords: listRecordsFn });

      await FollowService.checkFollowStatus(
        agent,
        "did:plc:self",
        ["did:plc:user1"],
        "custom.lexicon",
      );

      expect(listRecordsFn).toHaveBeenCalledWith(
        expect.objectContaining({
          repo: "did:plc:self",
          collection: "custom.lexicon",
          limit: 100,
        }),
      );
    });
  });

  describe("getAlreadyFollowing", () => {
    it("returns set of followed DIDs", async () => {
      const records = buildFollowRecords(["did:plc:user1", "did:plc:user3"]);
      const agent = createMockAgent({
        listRecords: async () => ({
          data: { records, cursor: undefined },
        }),
      });

      const result = await FollowService.getAlreadyFollowing(
        agent,
        "did:plc:self",
        ["did:plc:user1", "did:plc:user2", "did:plc:user3"],
      );

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(2);
      expect(result.has("did:plc:user1")).toBe(true);
      expect(result.has("did:plc:user3")).toBe(true);
      expect(result.has("did:plc:user2")).toBe(false);
    });

    it("returns empty set when no DIDs are followed", async () => {
      const agent = createMockAgent({
        listRecords: async () => ({
          data: { records: [], cursor: undefined },
        }),
      });

      const result = await FollowService.getAlreadyFollowing(
        agent,
        "did:plc:self",
        ["did:plc:user1"],
      );

      expect(result.size).toBe(0);
    });

    it("returns empty set for empty input", async () => {
      const agent = createMockAgent();

      const result = await FollowService.getAlreadyFollowing(
        agent,
        "did:plc:self",
        [],
      );

      expect(result.size).toBe(0);
    });
  });
});
