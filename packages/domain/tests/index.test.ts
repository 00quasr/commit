import { describe, expect, it } from "vitest";
import { PHASE } from "../src/index";

describe("foundation", () => {
  it("is the foundation phase", () => {
    expect(PHASE).toBe("foundation");
  });
});
