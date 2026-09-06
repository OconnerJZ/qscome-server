import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class EvolveVerifiedReviews20260906170000 implements MigrationInterface {
  name = "EvolveVerifiedReviews20260906170000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableName = "review_comments";
    if (!(await queryRunner.hasTable(tableName))) return;

    const ensureColumn = async (column: TableColumn) => {
      if (!(await queryRunner.hasColumn(tableName, column.name))) {
        await queryRunner.addColumn(tableName, column);
      }
    };

    await queryRunner.query(
      `ALTER TABLE review_comments MODIFY comment_id INT NOT NULL AUTO_INCREMENT`,
    );

    await ensureColumn(new TableColumn({ name: "order_id", type: "int", isNullable: true }));
    await ensureColumn(new TableColumn({ name: "rating", type: "tinyint", isNullable: true }));
    await ensureColumn(new TableColumn({ name: "food_rating", type: "tinyint", isNullable: true }));
    await ensureColumn(new TableColumn({ name: "time_rating", type: "tinyint", isNullable: true }));
    await ensureColumn(new TableColumn({ name: "presentation_rating", type: "tinyint", isNullable: true }));
    await ensureColumn(new TableColumn({ name: "accuracy_rating", type: "tinyint", isNullable: true }));
    await ensureColumn(new TableColumn({ name: "owner_response_text", type: "text", isNullable: true }));
    await ensureColumn(new TableColumn({ name: "owner_response_by", type: "int", isNullable: true }));
    await ensureColumn(new TableColumn({ name: "owner_responded_at", type: "datetime", isNullable: true }));

    const table = await queryRunner.getTable(tableName);
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

    const refreshed = await queryRunner.getTable(tableName);
    if (!refreshed) return;

    if (!refreshed.foreignKeys.some((fk) => fk.name === "fk_review_order")) {
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
    if (!refreshed.foreignKeys.some((fk) => fk.name === "fk_review_owner_response_by")) {
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

    await queryRunner.query(
      `ALTER TABLE review_comments MODIFY comment_id INT NOT NULL`,
    );
  }
}
