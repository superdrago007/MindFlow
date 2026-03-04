import { isExpired, minutesUntilExpiry, toExpiryTimestamp } from "./auth";

describe("auth time utilities", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates expiry timestamps from seconds", () => {
    expect(toExpiryTimestamp(60)).toBe("2026-01-01T00:01:00.000Z");
  });

  it("detects expired token", () => {
    expect(isExpired("2025-12-31T23:59:59.000Z")).toBe(true);
  });

  it("detects valid token", () => {
    expect(isExpired("2026-01-01T00:05:00.000Z")).toBe(false);
  });

  it("treats malformed timestamps as expired", () => {
    expect(isExpired("not-a-date")).toBe(true);
    expect(minutesUntilExpiry("not-a-date")).toBe(0);
  });

  it("returns rounded minutes until expiry", () => {
    expect(minutesUntilExpiry("2026-01-01T00:02:10.000Z")).toBe(3);
  });
});
