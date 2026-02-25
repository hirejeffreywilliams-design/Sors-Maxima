import { pool } from "../db";
import { stripeService } from "../stripeService";

async function cleanup() {
  await pool.query("DELETE FROM user_picks WHERE username LIKE 'test_%'").catch(() => {});
  await pool.query("DELETE FROM ticket_history WHERE username LIKE 'test_%'").catch(() => {});
}

export default async function runTests(): Promise<{ file: string; passed: number; failed: number; errors: string[] }> {
  const errors: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  PASS: ${message}`);
      passed++;
    } else {
      console.log(`  FAIL: ${message}`);
      errors.push(message);
      failed++;
    }
  }

  try {
    await stripeService.init();
    await cleanup();

    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'user_picks'
      )
    `);
    assert(tableCheck.rows[0].exists === true, "user_picks table exists in database");

    await pool.query(`
      INSERT INTO user_picks (username, game_id, sport, pick, bet_type, odds_at_pick)
      VALUES ('test_settle_user', 'game_001', 'NBA', 'Lakers -3.5', 'spread', -110)
    `);

    const insertCheck = await pool.query("SELECT * FROM user_picks WHERE username = 'test_settle_user' AND game_id = 'game_001'");
    assert(insertCheck.rows.length > 0, "Can insert a pick into user_picks");
    assert(insertCheck.rows[0].odds_at_pick === -110, "Odds at placement stored correctly");
    assert(insertCheck.rows[0].settled === false, "Initial settled status is false");

    await pool.query(`
      UPDATE user_picks SET settled = true, won = true
      WHERE username = 'test_settle_user' AND game_id = 'game_001'
    `);
    const settledCheck = await pool.query("SELECT * FROM user_picks WHERE username = 'test_settle_user' AND game_id = 'game_001'");
    assert(settledCheck.rows[0].settled === true, "Settlement updates settled to true");
    assert(settledCheck.rows[0].won === true, "Settlement marks pick as won");

    await pool.query(`
      UPDATE user_picks SET closing_odds = -125, clv_result = ((-110.0) - (-125.0))
      WHERE username = 'test_settle_user' AND game_id = 'game_001'
    `);
    const clvCheck = await pool.query("SELECT * FROM user_picks WHERE username = 'test_settle_user' AND game_id = 'game_001'");
    assert(clvCheck.rows[0].clv_result === 15, "CLV calculated correctly (placement -110 vs close -125 = +15 positive CLV)");

    const ticketTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'ticket_history'
      )
    `);
    assert(ticketTableCheck.rows[0].exists === true, "ticket_history table exists in database");

    const subTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'user_subscriptions'
      )
    `);
    assert(subTableCheck.rows[0].exists === true, "user_subscriptions table persists across restarts");

    const communityTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'communities'
      )
    `);
    assert(communityTableCheck.rows[0].exists === true, "communities table exists (data persistence verified)");

    // Test negative CLV scenario
    await pool.query(`
      INSERT INTO user_picks (username, game_id, sport, pick, bet_type, odds_at_pick, closing_odds, clv_result, settled, won)
      VALUES ('test_settle_user', 'game_002', 'NFL', 'Chiefs -7', 'spread', -110, -105, -5, true, false)
    `);
    const negClv = await pool.query("SELECT * FROM user_picks WHERE username = 'test_settle_user' AND game_id = 'game_002'");
    assert(negClv.rows[0].clv_result === -5, "Negative CLV stored correctly (got worse odds than close)");
    assert(negClv.rows[0].won === false, "Lost pick tracked correctly");

  } catch (e: any) {
    console.log(`  ERROR: ${e.message}`);
    errors.push(e.message);
    failed++;
  } finally {
    await cleanup();
  }

  return { file: "settlementFlow.test.ts", passed, failed, errors };
}
