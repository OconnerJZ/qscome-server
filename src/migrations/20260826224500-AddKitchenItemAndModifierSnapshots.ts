import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class AddKitchenItemAndModifierSnapshots20260826224500 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "order_details",
      new TableColumn({
        name: "kitchen_status",
        type: "enum",
        enum: ["pending", "preparing", "ready"],
        default: "'pending'",
        isNullable: false,
      }),
    );

    // option_id was mandatory in the legacy model. New grouped choices use
    // choice_id, so both references are nullable while snapshot fields are the
    // durable source of truth for historical orders.
    await queryRunner.changeColumn(
      "order_detail_options",
      "option_id",
      new TableColumn({ name: "option_id", type: "int", isNullable: true }),
    );

    await queryRunner.addColumns("order_detail_options", [
      new TableColumn({ name: "choice_id", type: "int", isNullable: true }),
      new TableColumn({ name: "group_title", type: "varchar", length: "120", isNullable: true }),
      new TableColumn({ name: "choice_name", type: "varchar", length: "255", isNullable: true }),
      new TableColumn({ name: "price_extra", type: "decimal", precision: 10, scale: 2, default: "'0.00'", isNullable: false }),
      new TableColumn({ name: "selection_state", type: "enum", enum: ["selected", "removed"], default: "'selected'", isNullable: false }),
    ]);

    await queryRunner.createIndex(
      "order_detail_options",
      new TableIndex({ name: "IDX_order_detail_options_choice_id", columnNames: ["choice_id"] }),
    );

    await queryRunner.createForeignKey(
      "order_detail_options",
      new TableForeignKey({
        name: "FK_order_detail_options_choice",
        columnNames: ["choice_id"],
        referencedTableName: "menu_option_choices",
        referencedColumnNames: ["choice_id"],
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("order_detail_options");
    const choiceFk = table?.foreignKeys.find((fk) => fk.name === "FK_order_detail_options_choice");
    if (choiceFk) await queryRunner.dropForeignKey("order_detail_options", choiceFk);

    const choiceIndex = table?.indices.find((index) => index.name === "IDX_order_detail_options_choice_id");
    if (choiceIndex) await queryRunner.dropIndex("order_detail_options", choiceIndex);

    await queryRunner.dropColumn("order_detail_options", "selection_state");
    await queryRunner.dropColumn("order_detail_options", "price_extra");
    await queryRunner.dropColumn("order_detail_options", "choice_name");
    await queryRunner.dropColumn("order_detail_options", "group_title");
    await queryRunner.dropColumn("order_detail_options", "choice_id");

    await queryRunner.changeColumn(
      "order_detail_options",
      "option_id",
      new TableColumn({ name: "option_id", type: "int", isNullable: false }),
    );

    await queryRunner.dropColumn("order_details", "kitchen_status");
  }
}
