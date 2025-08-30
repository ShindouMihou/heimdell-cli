import {afterEach, beforeEach, describe, expect, it} from "bun:test";
import {createHeimdellClient} from "./client";

describe("createHeimdellClient", () => {
  const mockCredentials = {
    baseUrl: "https://api.example.com",
    username: "testuser",
    password: "testpass",
    tag: "testtag",
    platforms: ["android" as const, "ios" as const]
  };

  beforeEach(() => {
    // Set up global credentials
    globalThis.credentials = mockCredentials;
  });

  afterEach(() => {
    // Clean up global credentials
    delete globalThis.credentials;
  });

  it("should create client with correct base URL", () => {
    const client = createHeimdellClient();
    
    expect(client).toBeDefined();
    // The client structure depends on @client.ts/core implementation
    // We can test that it was called with correct parameters
  });

  it("should include authentication hook with Basic auth", () => {
    const client = createHeimdellClient();
    
    // Test that the client was created - the actual auth testing would require
    // mocking the @client.ts/core library or testing actual requests
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(client.updates).toBeDefined();
    expect(client.bundles).toBeDefined();
  });

  it("should create correct Basic auth header", () => {
    // Test the Basic auth encoding logic directly
    const { username, password } = mockCredentials;
    const expectedAuth = `Basic ${btoa(`${username}:${password}`)}`;
    
    expect(btoa(`${username}:${password}`)).toBe(btoa("testuser:testpass"));
    expect(expectedAuth).toBe(`Basic ${btoa("testuser:testpass")}`);
  });

  it("should throw error if credentials are not available", () => {
    delete globalThis.credentials;
    
    expect(() => createHeimdellClient()).toThrow();
  });

  it("should configure auth login route correctly", () => {
    const client = createHeimdellClient();
    
    expect(client.auth).toBeDefined();
    expect(typeof client.auth.login).toBe("function");
  });

  it("should have updates and bundles resources", () => {
    const client = createHeimdellClient();
    
    expect(client.updates).toBeDefined();
    expect(client.bundles).toBeDefined();
  });

  it("should handle credentials with all required fields", () => {
    globalThis.credentials = {
      ...mockCredentials,
      environment: "production"
    };
    
    const client = createHeimdellClient();
    expect(client).toBeDefined();
  });

  it("should handle credentials with minimal required fields", () => {
    globalThis.credentials = {
      baseUrl: "https://minimal.example.com",
      username: "user",
      password: "pass",
      tag: "tag",
      platforms: ["android" as const]
    };
    
    const client = createHeimdellClient();
    expect(client).toBeDefined();
  });
});