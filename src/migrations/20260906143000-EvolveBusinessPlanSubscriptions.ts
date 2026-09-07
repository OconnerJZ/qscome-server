import { MigrationInterface, QueryRunner } from "typeorm";

export class EvolveBusinessPlanSubscriptions20260906143000 implements MigrationInterface {
  name = "EvolveBusinessPlanSubscriptions20260906143000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE business_plan_subscriptions
        ADD COLUMN trial_plan_code VARCHAR(30) NULL AFTER ends_at,
        ADD COLUMN trial_starts_at DATETIME NULL AFTER trial_plan_code,
        ADD COLUMN trial_ends_at DATETIME NULL AFTER trial_starts_at
    `);

    // The previous model stored a trial in the same plan_code field used by the
    // base subscription. Preserve the old effective behavior by moving that
    // plan into the overlay and using FREE as the recoverable base. The old
    // model did not retain any earlier paid/base plan, so there is nothing else
    // that can be reconstructed safely.
    await queryRunner.query(`
      UPDATE business_plan_subscriptions
      SET trial_plan_code = plan_code,
          trial_starts_at = starts_at,
          trial_ends_at = ends_at,
          plan_code = 'free',
          status = 'active',
          ends_at = NULL
      WHERE status = 'trialing'
    `);

    // Enforce the domain invariant for existing data without overwriting any
    // business that already has an assigned subscription.
    await queryRunner.query(`
      INSERT INTO business_plan_subscriptions
        (business_id, plan_code, status, source, assigned_by, starts_at, ends_at, version, created_at, updated_at)
      SELECT
        b.business_id, 'free', 'active', 'system', NULL, CURRENT_TIMESTAMP, NULL, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM business b
      LEFT JOIN business_plan_subscriptions s ON s.business_id = b.business_id
      WHERE s.business_id IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort compatibility with the legacy one-plan model. An active trial
    // becomes the legacy trialing row before removing the overlay columns.
    await queryRunner.query(`
      UPDATE business_plan_subscriptions
      SET plan_code = trial_plan_code,
          status = 'trialing',
          starts_at = COALESCE(trial_starts_at, starts_at),
          ends_at = trial_ends_at
      WHERE trial_plan_code IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE business_plan_subscriptions
        DROP COLUMN trial_ends_at,
        DROP COLUMN trial_starts_at,
        DROP COLUMN trial_plan_code
    `);
  }
}
