import { describe, it, expect } from "bun:test";

describe("hash command", () => {
  it("should hash value correctly", () => {
    const testValue = "testpassword";
    const hashedValue = Bun.password.hashSync(testValue);
    
    expect(hashedValue).toMatch(/^\$argon2id\$/);
    expect(hashedValue).toContain("$v=19$");
  });

  it("should produce different hashes for different inputs", () => {
    const hash1 = Bun.password.hashSync("password1");
    const hash2 = Bun.password.hashSync("password2");
    
    expect(hash1).not.toBe(hash2);
  });

  it("should produce consistent hash format", () => {
    const hash = Bun.password.hashSync("test");
    
    // Should be Argon2id format
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=\d+,t=\d+,p=\d+\$/);
  });

  it("should verify hashed passwords", () => {
    const password = "mysecretpassword";
    const hash = Bun.password.hashSync(password);
    
    expect(Bun.password.verifySync(password, hash)).toBe(true);
    expect(Bun.password.verifySync("wrongpassword", hash)).toBe(false);
  });
});