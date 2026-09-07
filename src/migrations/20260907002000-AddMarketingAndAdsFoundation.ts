import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMarketingAndAdsFoundation20260907002000 implements MigrationInterface {
  name = "AddMarketingAndAdsFoundation20260907002000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE marketing_campaigns (
      campaign_id int NOT NULL AUTO_INCREMENT,
      business_id int NOT NULL,
      name varchar(120) NOT NULL,
      message varchar(280) NOT NULL,
      objective enum('acquisition','retention','reactivation') NOT NULL,
      audience enum('all','new','returning','frequent','inactive_90') NOT NULL DEFAULT 'all',
      status enum('draft','scheduled','active','paused','ended') NOT NULL DEFAULT 'draft',
      starts_at datetime NULL,
      ends_at datetime NULL,
      created_by int NOT NULL,
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_marketing_campaign_business (business_id, status),
      CONSTRAINT fk_marketing_campaign_business FOREIGN KEY (business_id) REFERENCES business(business_id) ON DELETE CASCADE,
      CONSTRAINT fk_marketing_campaign_creator FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
      PRIMARY KEY (campaign_id)
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE ad_campaigns (
      ad_campaign_id int NOT NULL AUTO_INCREMENT,
      business_id int NOT NULL,
      name varchar(120) NOT NULL,
      surface enum('explore','hero') NOT NULL DEFAULT 'explore',
      objective varchar(40) NOT NULL DEFAULT 'orders',
      daily_budget decimal(10,2) NOT NULL,
      total_budget decimal(10,2) NOT NULL,
      radius_km decimal(7,2) NULL,
      status enum('draft','pending_billing','ready','active','paused','ended') NOT NULL DEFAULT 'draft',
      starts_at datetime NOT NULL,
      ends_at datetime NOT NULL,
      spent_amount decimal(10,2) NOT NULL DEFAULT 0,
      impressions int NOT NULL DEFAULT 0,
      clicks int NOT NULL DEFAULT 0,
      created_by int NOT NULL,
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_ad_campaign_business (business_id, status),
      INDEX idx_ad_campaign_serving (surface, status, starts_at, ends_at),
      CONSTRAINT fk_ad_campaign_business FOREIGN KEY (business_id) REFERENCES business(business_id) ON DELETE CASCADE,
      CONSTRAINT fk_ad_campaign_creator FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
      PRIMARY KEY (ad_campaign_id)
    ) ENGINE=InnoDB`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS ad_campaigns");
    await queryRunner.query("DROP TABLE IF EXISTS marketing_campaigns");
  }
}
