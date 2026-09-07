import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from "typeorm";

const LEGACY_REVIEW_DEPENDENCIES = [
  {
    tableName: "review_details",
    columnName: "comment_id",
    foreignKeyName: "review_details_ibfk_1",
  },
  {
    tableName: "votes",
    columnName: "comment_id",
    foreignKeyName: "votes_ibfk_1",
  },
] as const;

export class EvolveVerifiedReviews20260906170000 implements MigrationInterface {
  name = "EvolveVerifiedReviews20260906170000";

  private async suspendLegacyReviewForeignKeys(
    queryRunner: QueryRunner,
  ): Promise<Array<{ tableName: string; foreignKey: TableForeignKey }>> {
    const suspended: Array<{ tableName: string; foreignKey: TableForeignKey }> = [];

    for (const dependency of LEGACY_REVIEW_DEPENDENCIES) {
      if (!(await queryRunner.hasTable(dependency.tableName))) continue;

      const table = await queryRunner.getTable(dependency.tableName);
      if (!table) continue;

      for (const foreignKey of table.foreignKeys.filter(
        (fk) =>
          fk.referencedTableName === "review_comments" &&
          fk.columnNames.includes(dependency.columnName) &&
          fk.referencedColumnNames.includes("comment_id"),
      )) {
        suspended.push({ tableName: dependency.tableName, foreignKey });
        await queryRunner.dropForeignKey(dependency.tableName, foreignKey);
      }
    }

    return suspended;
  }

  private async restoreSuspendedForeignKeys(
    queryRunner: QueryRunner,
    suspended: Array<{ tableName: string; foreignKey: TableForeignKey }>,
  ): Promise<void> {
    for (const { tableName, foreignKey } of suspended) {
      if (!(await queryRunner.hasTable(tableName))) continue;
      const table = await queryRunner.getTable(tableName);
      if (!table) continue;

      if (foreignKey.name && table.foreignKeys.some((fk) => fk.name === foreignKey.name)) {
        continue;
      }

      await queryRunner.createForeignKey(tableName, foreignKey);
    }
  }

  private async ensureLegacyReviewForeignKeys(queryRunner: QueryRunner): Promise<void> {
    for (const dependency of LEGACY_REVIEW_DEPENDENCIES) {
      if (!(await queryRunner.hasTable(dependency.tableName))) continue;
      if (!(await queryRunner.hasColumn(dependency.tableName, dependency.columnName))) continue;

      const table = await queryRunner.getTable(dependency.tableName);
      if (!table) continue;

      const alreadyReferencesReview = table.foreignKeys.some(
        (fk) =>
          fk.referencedTableName === "review_comments" &&
          fk.columnNames.includes(dependency.columnName) &&
          fk.referencedColumnNames.includes("comment_id"),
      );
      if (alreadyReferencesReview) continue;

      await queryRunner.createForeignKey(
        dependency.tableName,
        new TableForeignKey({
          name: dependency.foreignKeyName,
          columnNames: [dependency.columnName],
          referencedTableName: "review_comments",
          referencedColumnNames: ["comment_id"],
        }),
      );
    }
  }

  private async setCommentIdAutoIncrement(
    queryRunner: QueryRunner,
    enabled: boolean,
  ): Promise<void> {
    const table = await queryRunner.getTable("review_comments");
    const commentId = table?.findColumnByName("comment_id");
    if (!commentId) return;

    const isAutoIncrement = commentId.isGenerated && commentId.generationStrategy === "increment";
    if (isAutoIncrement === enabled) {
      await this.ensureLegacyReviewForeignKeys(queryRunner);
      return;
    }

    const suspended = await this.suspendLegacyReviewForeignKeys(queryRunner);

    try {
      await queryRunner.query(
        `ALTER TABLE review_comments MODIFY comment_id INT NOT NULL${enabled ? " AUTO_INCREMENT" : ""}`,
      );
    } finally {
      // MariaDB DDL can implicitly commit, so restoring the legacy relationships
      // is best-effort even when the ALTER itself throws.
      await this.restoreSuspendedForeignKeys(queryRunner, suspended);
    }

    // Also heals a prior partially applied migration where the ALTER succeeded
    // but the process stopped before every legacy FK was recreated.
    await this.ensureLegacyReviewForeignKeys(queryRunner);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableName = "review_comments";
    if (!(await queryRunner.hasTable(tableName))) return;

    const ensureColumn = async (column: TableColumn) => {
      if (!(await queryRunner.hasColumn(tableName, column.name))) {
        await queryRunner.addColumn(tableName, column);
      }
    };

    await this.setCommentIdAutoIncrement(queryRunner, true);

    await ensureColumn(new TableColumn({ name: "order_id", type: "int", isNullable: true }));
    await ensureColumn(new TableColumn({ name: "rating", type: "tinyint", isNullable: true }));
    await ensureColumn(new TableColumn({ name: "food_rating", type: "tinyint", isNullable: true }));
    await ensureColumn(new TableColumn({ name: "time_rating", type: "tinyint", isNullable: true }));
    await ensureColumn(new TableColumn({ name: "presentation_rating", type: "tinyint", isNullable: true }));
    await ensureColumn(new TableColumn({ name: "accuracy_rating", type: "tinyint", isNullable: true }));
    await ensureColumn(new TableColumn({ name: "owner_response_text", type: "text", isNullable: true }));
    await ensureColumn(new TableColumn({ name: "owner_response_by", type: "int", isNullable: true }));
    await ensureColumn(new TableColumn({ name: "owner_responded_at", type: "datetime", isNullable: true }));

    let table = await queryRunner.getTable(tableName);
    if (!table) return;

    if (!table.indices.some((index) => index.name === "uq_review_order")) {
      await queryRunner.createIndex(
        tableName,
        new TableIndex({ name: "uq_review_order", columnNames: ["order_id"], isUnique: true }),
      );
    }
    if (!table.indices.some((index) => index.name === "idx_review_business_rating")) {
      await queryRunner.createIndex(
        tableName,
        new TableIndex({
          name: "idx_review_business_rating",
          columnNames: ["business_id", "rating", "comment_date"],
        }),
      );
    }

    table = await queryRunner.getTable(tableName);
    if (!table) return;

    if (!table.foreignKeys.some((fk) => fk.name === "fk_review_order")) {
      await queryRunner.createForeignKey(
        tableName,
        new TableForeignKey({
          name: "fk_review_order",
          columnNames: ["order_id"],
          referencedTableName: "orders",
          referencedColumnNames: ["order_id"],
          onDelete: "SET NULL",
          onUpdate: "RESTRICT",
        }),
      );
    }
    if (!table.foreignKeys.some((fk) => fk.name === "fk_review_owner_response_by")) {
      await queryRunner.createForeignKey(
        tableName,
        new TableForeignKey({
          name: "fk_review_owner_response_by",
          columnNames: ["owner_response_by"],
          referencedTableName: "users",
          referencedColumnNames: ["user_id"],
          onDelete: "SET NULL",
          onUpdate: "RESTRICT",
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableName = "review_comments";
    const table = await queryRunner.getTable(tableName);
    if (!table) return;

    for (const name of ["fk_review_order", "fk_review_owner_response_by"]) {
      const foreignKey = table.foreignKeys.find((fk) => fk.name === name);
      if (foreignKey) await queryRunner.dropForeignKey(tableName, foreignKey);
    }

    const refreshed = await queryRunner.getTable(tableName);
    if (refreshed) {
      for (const name of ["uq_review_order", "idx_review_business_rating"]) {
        const index = refreshed.indices.find((entry) => entry.name === name);
        if (index) await queryRunner.dropIndex(tableName, index);
      }
    }

    for (const name of [
      "owner_responded_at",
      "owner_response_by",
      "owner_response_text",
      "accuracy_rating",
      "presentation_rating",
      "time_rating",
      "food_rating",
      "rating",
      "order_id",
    ]) {
      if (await queryRunner.hasColumn(tableName, name)) {
        await queryRunner.dropColumn(tableName, name);
      }
    }

    await this.setCommentIdAutoIncrement(queryRunner, false);
  }
}
