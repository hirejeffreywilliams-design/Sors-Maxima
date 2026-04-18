import { readdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface TestResult {
  file: string;
  passed: number;
  failed: number;
  errors: string[];
}

async function runTests() {
  // CI safety: these tests should not require provisioning external services.
  // Provide a harmless default so optional DB paths don't crash the runner.
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
  }

  const files = await readdir(__dirname);
  const testFiles = files
    .filter(f => f.endsWith(".test.ts"))
    // CI safety: DB-backed tests require an actual Postgres instance.
    // Skip them in CI unless explicitly enabled.
    .filter(f => {
      const dbTests = ["stripeService.test.ts", "settlementFlow.test.ts", "tierGating.test.ts"];
      if (dbTests.includes(f) && process.env.RUN_DB_TESTS !== "true") return false;
      return true;
    });

  const results: TestResult[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const file of testFiles) {
    const filePath = join(__dirname, file);
    console.log(`\n--- Running ${file} ---`);

    try {
      const mod = await import(filePath);
      const result: TestResult = await mod.default();
      results.push(result);
      totalPassed += result.passed;
      totalFailed += result.failed;

      if (result.errors.length > 0) {
        for (const err of result.errors) {
          console.log(`  FAIL: ${err}`);
        }
      }
      console.log(`  ${result.passed} passed, ${result.failed} failed`);
    } catch (e: any) {
      console.log(`  FATAL: ${e.message}`);
      results.push({ file, passed: 0, failed: 1, errors: [e.message] });
      totalFailed++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Test Summary: ${totalPassed} passed, ${totalFailed} failed`);
  console.log(`========================================\n`);

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runTests();
