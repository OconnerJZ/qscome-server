import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class AddAdModeration20260907230000 implements MigrationInterface {
  name = "AddAdModeration20260907230000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("ad_campaigns"))) return;

    if (!(await queryRunner.hasColumn("ad_campaigns", "moderation_status"))) {
      await queryRunner.addColumn("ad_campaigns", new TableColumn({
        name: "moderation_status",
        type: "enum",
        enum: ["not_submitted", "pending", "approved", "rejected"],
        default: "'not_submitted'",
      }));
    }
    if (!(await queryRunner.hasColumn("ad_campaigns", "moderation_reason"))) {
      await queryRunner.addColumn("ad_campaigns", new TableColumn({
        name: "moderation_reason",
        type: "varchar",
        length: "500",
        isNullable: true,
      }));
    }
    if (!(await queryRunner.hasColumn("ad_campaigns", "moderated_by"))) {
      await queryRunner.addColumn("ad_campaigns", new TableColumn({
        name: "moderated_by",
        type: "int",
        isNullable: true,
      }));
    }
    if (!(await queryRunner.hasColumn("ad_campaigns", "moderated_at"))) {
      await queryRunner.addColumn("ad_campaigns", new TableColumn({
        name: "moderated_at",
        type: "datetime",
        isNullable: true,
      }));
    }

    // Existing submitted/serving-ready campaigns predate moderation. Route them
    // through the new queue instead of silently treating them as unsubmitted.
    await queryRunner.query(`
      UPDATE ad_campaigns
      SET moderation_status = 'pending'
      WHERE moderation_status = 'not_submitted'
        AND status IN ('pending_billing', 'ready', 'active')
    `);

    const table = await queryRunner.getTable("ad_campaigns");
    if (table && !table.indices.some((index) => index.name === "idx_ad_campaign_moderation")) {
      await queryRunner.createIndex("ad_campaigns", new TableIndex({
        name: "idx_ad_campaign_moderation",
        columnNames: ["moderation_status", "status", "updated_at"],
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("ad_campaigns"))) return;
    const table = await queryRunner.getTable("ad_campaigns");
    if (table?.indices.some((index) => index.name === "idx_ad_campaign_moderation")) {
      await queryRunner.dropIndex("ad_campaigns", "idx_ad_campaign_moderation");
    }
    for (const column of ["moderated_at", "moderated_by", "moderation_reason", "moderation_status"]) {
      if (await queryRunner.hasColumn("ad_campaigns", column)) {
        await queryRunner.dropColumn("ad_campaigns", column);
      }
    }
  }
}
