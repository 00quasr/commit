import { describe, expect, it } from "vitest";
import { canonicalPair } from "../src/friendship";

describe("canonicalPair", () => {
  it("sorts low<high regardless of input order", () => {
    expect(canonicalPair("aaa", "bbb")).toEqual({ low: "aaa", high: "bbb" });
    expect(canonicalPair("bbb", "aaa")).toEqual({ low: "aaa", high: "bbb" });
  });

  it("is stable across calls", () => {
    const p1 = canonicalPair("zzz", "aaa");
    const p2 = canonicalPair("aaa", "zzz");
    expect(p1).toEqual(p2);
  });

  it("rejects self-pair", () => {
    expect(() => canonicalPair("same", "same")).toThrow();
  });
});
