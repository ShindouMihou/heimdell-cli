import { describe, it, expect } from "bun:test";
import { sanitizeEnvironmentName, validateEnvironmentName } from "../utils/environment";

describe("login command dependencies", () => {
  it("should sanitize environment names correctly", () => {
    expect(sanitizeEnvironmentName("Test Environment")).toBe("test_environment");
    expect(sanitizeEnvironmentName("Dev-2024!")).toBe("dev2024");
  });

  it("should validate environment names", () => {
    expect(() => validateEnvironmentName("production")).not.toThrow();
    expect(() => validateEnvironmentName("")).toThrow();
    expect(() => validateEnvironmentName("a".repeat(31))).toThrow();
  });

  it("should handle credentials structure", () => {
    const credentials = {
      baseUrl: "https://api.example.com",
      username: "testuser", 
      password: "testpass",
      tag: "testtag",
      platforms: ["android", "ios"] as const,
      environment: "production"
    };

    expect(credentials.baseUrl).toBe("https://api.example.com");
    expect(credentials.platforms).toContain("android");
    expect(credentials.platforms).toContain("ios");
  });
});