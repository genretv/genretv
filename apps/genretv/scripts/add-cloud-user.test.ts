import { describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import type { ReadStream, WriteStream } from "node:tty";

import { parseCloudUserArgs, readHiddenLine, rolesForProfile } from "./add-cloud-user";

class FakeTtyInput extends EventEmitter {
  isRaw = false;
  readonly isTTY = true;
  pauseCalls = 0;

  isPaused(): boolean {
    return false;
  }

  pause(): this {
    this.pauseCalls += 1;
    return this;
  }

  resume(): this {
    return this;
  }

  setRawMode(value: boolean): this {
    this.isRaw = value;
    return this;
  }
}

class FakeTtyOutput {
  readonly isTTY = true;
  value = "";

  write(value: string): boolean {
    this.value += value;
    return true;
  }
}

describe("cloud user command", () => {
  test("accepts a publisher account", () => {
    expect(parseCloudUserArgs(["Canonical-Import@Example.com", "publisher"])).toEqual({
      email: "canonical-import@example.com",
      profile: "publisher",
    });
    expect(rolesForProfile("publisher")).toEqual(["publisher"]);
  });

  test("gives canonical maintainers both trusted roles", () => {
    expect(parseCloudUserArgs(["maintainer@example.com", "canonical_maintainer"])).toEqual({
      email: "maintainer@example.com",
      profile: "canonical_maintainer",
    });
    expect(rolesForProfile("canonical_maintainer")).toEqual(["canonical_maintainer", "publisher"]);
  });

  test("rejects unknown roles and malformed invocations", () => {
    expect(() => parseCloudUserArgs(["person@example.com", "admin"])).toThrow(
      "role must be publisher or canonical_maintainer",
    );
    expect(() => parseCloudUserArgs(["not-an-email", "publisher"])).toThrow("valid email address");
    expect(() => parseCloudUserArgs(["person@example.com"])).toThrow("Usage:");
  });

  test("pauses terminal input after reading a hidden line", async () => {
    const input = new FakeTtyInput();
    const output = new FakeTtyOutput();
    const password = readHiddenLine("Password: ", input as unknown as ReadStream, output as unknown as WriteStream);

    input.emit("keypress", "secret", { name: "s" });
    input.emit("keypress", undefined, { name: "return" });

    expect(await password).toBe("secret");
    expect(input.isRaw).toBe(false);
    expect(input.pauseCalls).toBe(1);
    expect(output.value).toBe("Password: \n");
  });
});
