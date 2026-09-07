import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class EvolveBusinessPlanSubscriptions20260906143000 implements MigrationInterface {
  name = "EvolveBusinessPlanSubscriptions20260906143000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableName = "business_plan_subscriptions";

    const ensureColumn = async (column: TableColumn) => {
      if (!(await queryRunner.hasColumn(tableName, column.name))) {
        await queryRunner.addColumn(tableName, column);
      }
    };

    // MariaDB can persist DDL even when the surrounding migration transaction
    // later rolls back. Add these columns independently so a retry after a
    // partially applied deployment remains safe.
    await ensureColumn(
      new TableColumn({ name: "trial_plan_code", type: "varchar", length: "30", isNullable: true }),
    );
    await ensureColumn(
      new TableColumn({ name: "trial_starts_at", type: "datetime", isNullable: true }),
    );
    await ensureColumn(
      new TableColumn({ name: "trial_ends_at", type: "datetime", isNullable: true }),
    );

    // The previous model stored a trial in the same plan_code field used by the
    // base subscription. Preserve the old effective behavior by moving that
    // plan into the overlay and using FREE as the recoverable base. The old
    // model did not retain any earlier paid/base plan, so there is nothing else
    // that can be reconstructed safely. This UPDATE is naturally idempotent
    // because migrated rows no longer remain in the trialing status.
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
    // business that already has an assigned subscription. Safe to retry.
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
    const tableName = "business_plan_subscriptions";
    const hasTrialPlanCode = await queryRunner.hasColumn(tableName, "trial_plan_code");
    const hasTrialStartsAt = await queryRunner.hasColumn(tableName, "trial_starts_at");
    const hasTrialEndsAt = await queryRunner.hasColumn(tableName, "trial_ends_at");

    // Best-effort compatibility with the legacy one-plan model. Only attempt
    // the data rewrite when the complete overlay exists.
    if (hasTrialPlanCode && hasTrialStartsAt && hasTrialEndsAt) {
      await queryRunner.query(`
        UPDATE business_plan_subscriptions
        SET plan_code = trial_plan_code,
            status = 'trialing',
            starts_at = COALESCE(trial_starts_at, starts_at),
            ends_at = trial_ends_at
        WHERE trial_plan_code IS NOT NULL
      `);
    }

    for (const name of ["trial_ends_at", "trial_starts_at", "trial_plan_code"]) {
      if (await queryRunner.hasColumn(tableName, name)) {
        await queryRunner.dropColumn(tableName, name);
      }
    }
  }
}
