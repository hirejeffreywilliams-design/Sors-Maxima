import assert from "assert/strict";
import { getMultiplier } from "../services/momentum-chain";

export default async function run() {
  const errors: string[] = [];
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      passed++;
      console.log(`  PASS: ${name}`);
    } catch (e: any) {
      failed++;
      errors.push(`${name}: ${e.message}`);
    }
  }

  test("getMultiplier returns 1x for streak of 0", () => {
    assert.equal(getMultiplier(0), 1);
  });

  test("getMultiplier returns 1.5x for streak of 1", () => {
    assert.equal(getMultiplier(1), 1.5);
  });

  test("getMultiplier returns 2x for streak of 2", () => {
    assert.equal(getMultiplier(2), 2);
  });

  test("getMultiplier returns 3x for streak of 3", () => {
    assert.equal(getMultiplier(3), 3);
  });

  test("getMultiplier returns 5x for streak of 4", () => {
    assert.equal(getMultiplier(4), 5);
  });

  test("getMultiplier caps at 5x for streak > 4", () => {
    assert.equal(getMultiplier(10), 5);
    assert.equal(getMultiplier(100), 5);
  });

  test("getMultiplier returns number type for all tiers", () => {
    for (let i = 0; i <= 10; i++) {
      const result = getMultiplier(i);
      assert.equal(typeof result, "number", `Streak ${i} should return a number`);
      assert.ok(result >= 1, `Multiplier for streak ${i} should be >= 1`);
      assert.ok(result <= 5, `Multiplier for streak ${i} should be <= 5`);
    }
  });

  test("multiplier progression is monotonically non-decreasing", () => {
    let prev = getMultiplier(0);
    for (let i = 1; i <= 10; i++) {
      const curr = getMultiplier(i);
      assert.ok(curr >= prev, `Multiplier should not decrease: streak ${i - 1}=${prev}, streak ${i}=${curr}`);
      prev = curr;
    }
  });

  return { file: "momentumChain.test.ts", passed, failed, errors };
}
