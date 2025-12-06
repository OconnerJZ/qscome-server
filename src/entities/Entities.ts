import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, ManyToMany, JoinTable, JoinColumn } from 'typeorm';

// ========== USER ENTITIES ==========

@Entity('user_roles')
export class UserRole {
  @PrimaryGeneratedColumn()
  role_id!: number;

  @Column({ length: 50 })
  role_name!: string;

  @OneToMany(() => User, user => user.role)
  users!: User[];
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  user_id!: number;

  @Column({ length: 255, nullable: true })
  user_name!: string;

  @Column({ length: 255, nullable: true })
  email!: string;

  @Column({ type: 'boolean', default: false })
  is_subscribed!: boolean;

  @Column({ type: 'boolean', default: false })
  is_payment_active!: boolean;

  @Column({ length: 30, nullable: true })
  phone!: string;

  @Column({ length: 255, nullable: true })
  password_hash!: string;

  @Column({ type: 'enum', enum: ['local', 'google', 'facebook'], default: 'local' })
  auth_provider!: string;

  @Column({ length: 255, nullable: true })
  auth_provider_id!: string;

  @Column({ length: 255, nullable: true })
  avatar_url!: string;

  @Column({ nullable: true })
  role_id!: number;

  @Column({ length: 10, default: 'es_MX' })
  locale!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => UserRole, role => role.users)
  @JoinColumn({ name: 'role_id' })
  role!: UserRole;

  @OneToMany(() => UserAddress, address => address.user)
  addresses!: UserAddress[];

  @OneToMany(() => Order, order => order.user)
  orders!: Order[];

  @OneToMany(() => Payment, p => p.user, { eager: false })
  payments!: Payment[];

  @OneToMany(() => UserSession, session => session.user)
  sessions!: UserSession[];

  @OneToMany(() => UserWallet, wallet => wallet.user)
  wallets!: UserWallet[];

  @OneToMany(() => BusinessOwner, owner => owner.user)
  businesses_owned!: BusinessOwner[];
}

@Entity('user_addresses')
export class UserAddress {
  @PrimaryGeneratedColumn()
  address_id!: number;

  @Column()
  user_id!: number;

  @Column({ length: 50, nullable: true })
  label!: string;

  @Column({ length: 120, nullable: true })
  recipient_name!: string;

  @Column({ length: 30, nullable: true })
  phone!: string;

  @Column({ length: 255, nullable: true })
  address!: string;

  @Column({ length: 120, nullable: true })
  city!: string;

  @Column({ length: 120, nullable: true })
  state!: string;

  @Column({ length: 20, nullable: true })
  postal_code!: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude!: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude!: number;

  @Column({ type: 'boolean', default: false })
  is_default!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => User, user => user.addresses)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => Order, order => order.delivery_address_entity)
  orders!: Order[];
}

@Entity('user_sessions')
export class UserSession {
  @PrimaryGeneratedColumn()
  session_id!: number;

  @Column()
  user_id!: number;

  @Column({ length: 512 })
  jwt_token!: string;

  @Column({ length: 512, nullable: true })
  refresh_token!: string;

  @Column({ length: 512, nullable: true })
  user_agent!: string;

  @Column({ length: 50, nullable: true })
  ip_address!: string;

  @CreateDateColumn()
  created_at!: Date;

  @Column({ type: 'datetime', nullable: true })
  expires_at!: Date;

  @ManyToOne(() => User, user => user.sessions)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}

@Entity('user_wallets')
export class UserWallet {
  @PrimaryGeneratedColumn()
  wallet_id!: number;

  @Column()
  user_id!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance!: number;

  @UpdateDateColumn()
  last_update!: Date;

  @ManyToOne(() => User, user => user.wallets)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}

// ========== BUSINESS ENTITIES ==========

@Entity('food_types')
export class FoodType {
  @PrimaryGeneratedColumn()
  food_type_id!: number;

  @Column({ length: 50, nullable: true })
  type_name!: string;

  @ManyToMany(() => Business, business => business.food_types)
  businesses!: Business[];
}

@Entity('business')
export class Business {
  @PrimaryGeneratedColumn()
  business_id!: number;

  @Column({ length: 255, nullable: true })
  business_name!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ length: 30, nullable: true })
  phone!: string;

  @Column({ length: 255, nullable: true })
  email!: string;

  @Column({ length: 255, nullable: true })
  logo_url!: string;

  @Column({ length: 255, nullable: true })
  banner_url!: string;

  @Column({ nullable: true })
  prep_time_min!: number;

  @Column({ nullable: true })
  estimated_delivery_min!: number;

  @Column({ type: 'boolean', default: true })
  is_open!: boolean;

  @Column({ type: 'boolean', default: false })
  is_verified!: boolean;

  @Column({ type: 'datetime', nullable: true })
  verified_at!: Date;

  @OneToMany(() => Location, location => location.business)
  locations!: Location[];

  @OneToMany(() => Menu, menu => menu.business)
  menus!: Menu[];

  @OneToMany(() => Order, order => order.business)
  orders!: Order[];

  @OneToMany(() => BusinessOwner, owner => owner.business)
  owners!: BusinessOwner[];

  @OneToMany(() => BusinessPhoto, photo => photo.business)
  photos!: BusinessPhoto[];

  @OneToMany(() => BusinessDeliverySetting, setting => setting.business)
  delivery_settings!: BusinessDeliverySetting[];

  @OneToMany(() => BusinessPaymentMethod, method => method.business)
  payment_methods!: BusinessPaymentMethod[];

  @ManyToMany(() => FoodType, foodType => foodType.businesses)
  @JoinTable({
    name: 'business_food_types',
    joinColumn: { name: 'business_id' },
    inverseJoinColumn: { name: 'food_type_id' }
  })
  food_types!: FoodType[];
}

@Entity('business_owners')
export class BusinessOwner {
  @PrimaryGeneratedColumn()
  owner_id!: number;

  @Column()
  user_id!: number;

  @Column()
  business_id!: number;

  @Column({ type: 'enum', enum: ['owner', 'manager', 'staff'], default: 'owner' })
  role_in_business!: string;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => User, user => user.businesses_owned)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Business, business => business.owners)
  @JoinColumn({ name: 'business_id' })
  business!: Business;
}

@Entity('business_photos')
export class BusinessPhoto {
  @PrimaryGeneratedColumn()
  photo_id!: number;

  @Column({ nullable: true })
  business_id!: number;

  @Column({ length: 255, nullable: true })
  photo_url!: string;

  @ManyToOne(() => Business, business => business.photos)
  @JoinColumn({ name: 'business_id' })
  business!: Business;
}

@Entity('business_delivery_settings')
export class BusinessDeliverySetting {
  @PrimaryGeneratedColumn()
  setting_id!: number;

  @Column()
  business_id!: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 5.00 })
  delivery_radius_km!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  delivery_fee!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  min_order_amount!: number;

  @Column({ nullable: true })
  estimated_time_min!: number;

  @Column({ type: 'boolean', default: false })
  use_own_delivery!: boolean;

  @Column({ type: 'json', nullable: true })
  polygon_json!: any;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => Business, business => business.delivery_settings)
  @JoinColumn({ name: 'business_id' })
  business!: Business;
}

@Entity('business_payment_methods')
export class BusinessPaymentMethod {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  business_id!: number;

  @Column({ type: 'enum', enum: ['cash', 'card', 'wallet', 'transfer'] })
  method!: string;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'json', nullable: true })
  config_json!: any;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Business, business => business.payment_methods)
  @JoinColumn({ name: 'business_id' })
  business!: Business;
}

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn()
  location_id!: number;

  @Column({ nullable: true })
  business_id!: number;

  @Column({ length: 255, nullable: true })
  address!: string;

  @Column({ length: 255, nullable: true })
  city!: string;

  @Column({ length: 20, nullable: true })
  postal_code!: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude!: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude!: number;

  @ManyToOne(() => Business, business => business.locations)
  @JoinColumn({ name: 'business_id' })
  business!: Business;
}

// ========== MENU ENTITIES ==========

@Entity('menus')
export class Menu {
  @PrimaryGeneratedColumn()
  menu_id!: number;

  @Column({ nullable: true })
  business_id!: number;

  @Column({ length: 255, nullable: true })
  item_name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ length: 255, nullable: true })
  image_url!: string;

  @Column({ type: 'boolean', default: true })
  is_available!: boolean;

  @Column({ length: 100, nullable: true })
  category!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => Business, business => business.menus)
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @OneToMany(() => MenuOptionGroup, group => group.menu)
  option_groups!: MenuOptionGroup[];

  @OneToMany(() => OrderDetail, detail => detail.menu)
  order_details!: OrderDetail[];
}

@Entity('menu_option_groups')
export class MenuOptionGroup {
  @PrimaryGeneratedColumn()
  group_id!: number;

  @Column()
  menu_id!: number;

  @Column({ length: 120 })
  title!: string;

  @Column({ default: 0 })
  min_select!: number;

  @Column({ default: 0 })
  max_select!: number;

  @ManyToOne(() => Menu, menu => menu.option_groups)
  @JoinColumn({ name: 'menu_id' })
  menu!: Menu;

  @OneToMany(() => MenuOptionChoice, choice => choice.group)
  choices!: MenuOptionChoice[];
}

@Entity('menu_option_choices')
export class MenuOptionChoice {
  @PrimaryGeneratedColumn()
  choice_id!: number;

  @Column()
  group_id!: number;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price_extra!: number;

  @Column({ type: 'boolean', default: false })
  is_default!: boolean;

  @ManyToOne(() => MenuOptionGroup, group => group.choices)
  @JoinColumn({ name: 'group_id' })
  group!: MenuOptionGroup;
}

// ========== ORDER ENTITIES ==========

@Entity('delivery_persons')
export class DeliveryPerson {
  @PrimaryGeneratedColumn()
  delivery_id!: number;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 20, nullable: true })
  phone!: string;

  @Column({ type: 'enum', enum: ['available', 'busy', 'offline'], default: 'offline' })
  status!: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  current_lat!: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  current_lng!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: 'datetime', nullable: true })
  last_online!: Date;

  @Column({ nullable: true })
  current_accuracy!: number;

  @OneToMany(() => Order, order => order.delivery_person)
  orders!: Order[];
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  order_id!: number;

  @Column({ nullable: true })
  user_id!: number;

  @Column({ nullable: true })
  business_id!: number;

  @Column({ type: 'datetime', nullable: true })
  order_date!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ nullable: true })
  delivery_id!: number;

  @Column({ type: 'enum', enum: ['unassigned', 'assigned', 'on_route', 'delivered'], default: 'unassigned' })
  delivery_status!: string;

  @Column({ type: 'enum', enum: ['pending', 'accepted', 'preparing', 'ready', 'in_delivery', 'completed', 'cancelled'], default: 'pending' })
  status!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total!: number;

  @Column({ length: 255, nullable: true })
  customer_name!: string;

  @Column({ length: 30, nullable: true })
  customer_phone!: string;

  @Column({ type: 'text', nullable: true })
  delivery_address!: string;

  @Column({ type: 'text', nullable: true })
  order_notes!: string;

  @Column({ nullable: true })
  delivery_address_id!: number;

  @ManyToOne(() => User, user => user.orders)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Business, business => business.orders)
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @ManyToOne(() => DeliveryPerson, person => person.orders)
  @JoinColumn({ name: 'delivery_id' })
  delivery_person!: DeliveryPerson;

  @ManyToOne(() => UserAddress, address => address.orders)
  @JoinColumn({ name: 'delivery_address_id' })
  delivery_address_entity!: UserAddress;

  @OneToMany(() => OrderDetail, detail => detail.order)
  details!: OrderDetail[];

  @OneToMany(() => OrderStatusHistory, history => history.order)
  status_history!: OrderStatusHistory[];

  @OneToMany(() => Payment, payment => payment.order)
  payments!: Payment[];
}

@Entity('order_details')
export class OrderDetail {
  @PrimaryGeneratedColumn()
  order_detail_id!: number;

  @Column({ nullable: true })
  order_id!: number;

  @Column({ nullable: true })
  menu_id!: number;

  @Column({ nullable: true })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  subtotal!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @ManyToOne(() => Order, order => order.details)
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @ManyToOne(() => Menu, menu => menu.order_details)
  @JoinColumn({ name: 'menu_id' })
  menu!: Menu;
}

@Entity('order_status_history')
export class OrderStatusHistory {
  @PrimaryGeneratedColumn()
  history_id!: number;

  @Column()
  order_id!: number;

  @Column({ length: 50 })
  status!: string;

  @Column({ type: 'text', nullable: true })
  note!: string;

  @Column({ nullable: true })
  changed_by!: number;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Order, order => order.status_history)
  @JoinColumn({ name: 'order_id' })
  order!: Order;
}

// ========== PAYMENT ENTITIES ==========

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  payment_id!: number;
  
  @ManyToOne(() => User, u => u.payments, { eager: false })
  user!: User;
  
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount!: number;

  @Column({ type: 'datetime', nullable: true })
  payment_date!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: 'enum', enum: ['card', 'wallet', 'cash'], default: 'card' })
  payment_method!: string;

  @Column({ type: 'enum', enum: ['pending', 'completed', 'failed'], default: 'pending' })
  status!: string;

  @Column({ nullable: true })
  order_id!: number;

  @Column({ length: 255, nullable: true })
  gateway_id!: string;

  @Column({ type: 'json', nullable: true })
  gateway_response: any;

  @Column({ length: 10, default: 'MXN' })
  currency!: string;

  @ManyToOne(() => Order, order => order.payments)
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @OneToMany(() => Refund, refund => refund.payment)
  refunds!: Refund[];
}

@Entity('refunds')
export class Refund {
  @PrimaryGeneratedColumn()
  refund_id!: number;

  @Column()
  payment_id!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'text', nullable: true })
  reason!: string;

  @Column({ type: 'enum', enum: ['pending', 'completed', 'failed'], default: 'pending' })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Payment, payment => payment.refunds)
  @JoinColumn({ name: 'payment_id' })
  payment!: Payment;
}

// ========== AUDIT ENTITIES ==========

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  audit_id!: number;

  @Column({ nullable: true })
  actor_user_id!: number;

  @Column({ length: 100 })
  action!: string;

  @Column({ length: 100, nullable: true })
  target_table!: string;

  @Column({ nullable: true })
  target_id!: number;

  @Column({ type: 'json', nullable: true })
  before_json!: any;

  @Column({ type: 'json', nullable: true })
  after_json!: any;

  @CreateDateColumn()
  created_at!: Date;
}