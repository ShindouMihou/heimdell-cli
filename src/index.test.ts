import { describe, it, expect, mock } from "bun:test";

// Mock the command modules
const mockUseLoginCommand = mock(() => {});
const mockUsePushUpdateCommand = mock(() => {});
const mockUseListBundlesCommand = mock(() => {});
const mockUseRollbackCommand = mock(() => {});
const mockUseEnvCommand = mock(() => {});
const mockUseHashCommand = mock(() => {});

// Mock yargs
const mockYargs = {
  scriptName: mock(() => mockYargs),
  usage: mock(() => mockYargs),
  help: mock(() => mockYargs),
  parse: mock(() => {})
};

const mockYargsFunction = mock(() => mockYargs);

// Mock modules before importing
mock.module("./commands/login.tsx", () => ({ useLoginCommand: mockUseLoginCommand }));
mock.module("./commands/push-update.tsx", () => ({ usePushUpdateCommand: mockUsePushUpdateCommand }));
mock.module("./commands/list-bundles.tsx", () => ({ useListBundlesCommand: mockUseListBundlesCommand }));
mock.module("./commands/rollback.tsx", () => ({ useRollbackCommand: mockUseRollbackCommand }));
mock.module("./commands/env.tsx", () => ({ useEnvCommand: mockUseEnvCommand }));
mock.module("./commands/hash.ts", () => ({ useHashCommand: mockUseHashCommand }));
mock.module("yargs", () => ({ default: mockYargsFunction }));
mock.module("yargs/helpers", () => ({ hideBin: mock((argv: string[]) => argv.slice(2)) }));

describe("CLI index", () => {
  it("should configure yargs correctly", async () => {
    // Import after mocking
    await import("./index");

    expect(mockYargsFunction).toHaveBeenCalled();
    expect(mockYargs.scriptName).toHaveBeenCalledWith("heimdell");
    expect(mockYargs.usage).toHaveBeenCalledWith("$0 <cmd> [args]");
    expect(mockYargs.help).toHaveBeenCalled();
    expect(mockYargs.parse).toHaveBeenCalled();
  });

  it("should register all commands", async () => {
    // Import after mocking
    await import("./index");

    expect(mockUseLoginCommand).toHaveBeenCalledWith(mockYargs);
    expect(mockUsePushUpdateCommand).toHaveBeenCalledWith(mockYargs);
    expect(mockUseListBundlesCommand).toHaveBeenCalledWith(mockYargs);
    expect(mockUseRollbackCommand).toHaveBeenCalledWith(mockYargs);
    expect(mockUseEnvCommand).toHaveBeenCalledWith(mockYargs);
    expect(mockUseHashCommand).toHaveBeenCalledWith(mockYargs);
  });

  it("should process command line arguments", async () => {
    // Import after mocking
    await import("./index");

    // hideBin should have been called and parse should have been called with the result
    expect(mockYargs.parse).toHaveBeenCalled();
  });
});