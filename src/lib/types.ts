// Types mirroring the TerraByte API schemas (backend/terrabyte/schemas).

export type Role = 'farmer' | 'vendor' | 'hardware_vendor' | 'expert' | 'admin';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type Language = 'en' | 'hi' | 'mr';

export const ROLES: Role[] = ['farmer', 'vendor', 'hardware_vendor', 'expert', 'admin'];
export const SELF_REGISTER_ROLES: Exclude<Role, 'admin'>[] = ['farmer', 'vendor', 'hardware_vendor', 'expert'];
export const USER_STATUSES: UserStatus[] = ['pending', 'approved', 'rejected', 'suspended'];

export interface User {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  role: Role;
  status: UserStatus;
  preferred_language: Language;
  organization: string | null;
  qualifications: string | null;
  state: string | null;
  district: string | null;
  village: string | null;
  lat: number | null;
  lon: number | null;
  created_at: string;
}

export interface AdminUser extends User {
  status_reason: string | null;
  status_changed_at: string | null;
}

export interface UserPage {
  items: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RegisterResponse {
  user: User;
  requires_approval: boolean;
  access_token: string | null;
  expires_in: number | null;
}

export interface RegisterPayload {
  name: string;
  phone: string;
  password: string;
  role: Exclude<Role, 'admin'>;
  email?: string;
  preferred_language?: Language;
  organization?: string;
  qualifications?: string;
  state?: string;
  district?: string;
  village?: string;
}

export type MeUpdate = Partial<
  Pick<User, 'name' | 'email' | 'preferred_language' | 'organization' | 'qualifications' | 'state' | 'district' | 'village' | 'lat' | 'lon'>
>;

export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

// ---- Phase 2: shared -------------------------------------------------------------------------

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface UploadResult {
  path: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
}

// ---- Marketplace ------------------------------------------------------------------------------

export type ProductCategory = 'seeds' | 'fertilizer' | 'pesticide' | 'tools' | 'other';
export const PRODUCT_CATEGORIES: ProductCategory[] = ['seeds', 'fertilizer', 'pesticide', 'tools', 'other'];

export interface Product {
  id: number;
  vendor_id: number;
  vendor_name: string;
  vendor_district: string | null;
  name: string;
  category: ProductCategory;
  brand: string | null;
  unit: string;
  price_inr: number;
  stock: number;
  description: string | null;
  image_path: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductInput {
  name: string;
  category: ProductCategory;
  brand?: string | null;
  unit: string;
  price_inr: number;
  stock: number;
  description?: string | null;
  image_path?: string | null;
  active?: boolean;
}

export type OrderStatus = 'placed' | 'accepted' | 'shipped' | 'delivered' | 'cancelled' | 'rejected';
export const ORDER_STATUSES: OrderStatus[] = ['placed', 'accepted', 'shipped', 'delivered', 'cancelled', 'rejected'];
export type PaymentMethod = 'cod' | 'upi_on_delivery';
export const PAYMENT_METHODS: PaymentMethod[] = ['cod', 'upi_on_delivery'];
/** Vendor actions and the farmer's cancel; the server enforces the same machine. */
export type OrderAction = 'accept' | 'reject' | 'ship' | 'deliver' | 'cancel';

export interface OrderItem {
  id: number;
  product_id: number | null;
  product_name: string;
  unit: string;
  quantity: number;
  unit_price_inr: number;
  line_total_inr: number;
}

export interface Order {
  id: number;
  buyer_id: number;
  buyer_name: string;
  /** Only present for the vendor of the order (and admins). */
  buyer_phone: string | null;
  vendor_id: number;
  vendor_name: string;
  status: OrderStatus;
  total_inr: number;
  delivery_address: string;
  payment_method: PaymentMethod;
  note: string | null;
  status_reason: string | null;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  rejected_at: string | null;
  items: OrderItem[];
}

export interface OrderInput {
  items: { product_id: number; quantity: number }[];
  delivery_address: string;
  payment_method: PaymentMethod;
  note?: string | null;
}

// ---- Rentals ----------------------------------------------------------------------------------

export const EQUIPMENT_TYPES = [
  'tractor',
  'rotavator',
  'cultivator',
  'plough',
  'seed_drill',
  'sprayer',
  'harvester',
  'thresher',
  'reaper',
  'water_pump',
  'trolley',
  'other',
] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export interface Equipment {
  id: number;
  owner_id: number;
  owner_name: string;
  name: string;
  type: EquipmentType;
  rate_per_hour_inr: number | null;
  rate_per_day_inr: number | null;
  district: string | null;
  description: string | null;
  image_path: string | null;
  active: boolean;
  created_at: string;
}

export interface EquipmentInput {
  name: string;
  type: EquipmentType;
  rate_per_hour_inr?: number | null;
  rate_per_day_inr?: number | null;
  district?: string | null;
  description?: string | null;
  image_path?: string | null;
  active?: boolean;
}

export type RentalUnit = 'hour' | 'day';
export type BookingStatus = 'requested' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
export const BOOKING_STATUSES: BookingStatus[] = ['requested', 'accepted', 'rejected', 'cancelled', 'completed'];
export type BookingAction = 'accept' | 'reject' | 'complete' | 'cancel';

export interface Booking {
  id: number;
  equipment_id: number;
  equipment_name: string;
  equipment_type: EquipmentType;
  owner_id: number;
  owner_name: string;
  farmer_id: number;
  farmer_name: string;
  /** Only present for the equipment owner (and admins). */
  farmer_phone: string | null;
  start_at: string;
  end_at: string;
  unit: RentalUnit;
  units: number;
  rate_inr: number;
  amount_inr: number;
  status: BookingStatus;
  note: string | null;
  status_reason: string | null;
  created_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
}

export interface BookingInput {
  equipment_id: number;
  unit: RentalUnit;
  /** ISO 8601 with a time zone offset. */
  start_at: string;
  end_at: string;
  note?: string | null;
}

export interface BusySlot {
  start_at: string;
  end_at: string;
  status: BookingStatus;
}

// ---- Consultations, KVK, knowledge -------------------------------------------------------------

export const CONSULTATION_CATEGORIES = [
  'disease',
  'pest',
  'nutrient',
  'irrigation',
  'soil',
  'crop_planning',
  'market',
  'schemes',
  'other',
] as const;
export type ConsultationCategory = (typeof CONSULTATION_CATEGORIES)[number];
export type ConsultationStatus = 'open' | 'assigned' | 'answered' | 'closed';
export const CONSULTATION_STATUSES: ConsultationStatus[] = ['open', 'assigned', 'answered', 'closed'];

export interface Consultation {
  id: number;
  farmer_id: number;
  farmer_name: string;
  farmer_district: string | null;
  expert_id: number | null;
  expert_name: string | null;
  kvk_id: number | null;
  kvk_name: string | null;
  crop: string | null;
  category: ConsultationCategory | null;
  question: string;
  image_path: string | null;
  status: ConsultationStatus;
  created_at: string;
  updated_at: string;
  assigned_at: string | null;
  first_response_at: string | null;
  closed_at: string | null;
  message_count: number;
}

export interface ConsultationMessage {
  id: number;
  author_id: number;
  author_name: string;
  author_role: Role;
  body: string;
  image_path: string | null;
  created_at: string;
}

export interface ConsultationDetail extends Consultation {
  messages: ConsultationMessage[];
}

export interface ConsultationInput {
  crop?: string | null;
  category: ConsultationCategory;
  question: string;
  image_path?: string | null;
  kvk_id?: number | null;
}

export interface KVK {
  id: number;
  name: string;
  district: string;
  state: string;
  host_organisation: string | null;
  taluka?: string | null;
  address: string | null;
  pincode: string | null;
  /** Several numbers / addresses are joined with ", ". */
  phone: string | null;
  email: string | null;
  website: string | null;
  lat: number | null;
  lon: number | null;
  /** How exact lat/lon is, e.g. "village-level (...); not the KVK campus". */
  coords_precision?: string | null;
  /** True unless the point is the KVK site itself. */
  coords_approximate?: boolean;
  source_url: string | null;
  sources?: string[] | null;
  verified_on: string | null;
  created_at: string;
}

export interface KVKNearest extends KVK {
  distance_km: number;
}

export type KVKInput = Partial<Omit<KVK, 'id' | 'created_at' | 'coords_approximate' | 'sources'>> &
  Pick<KVK, 'name' | 'district' | 'state'>;

export interface DataImport {
  id: number;
  kind: string;
  source: string;
  created: number;
  updated: number;
  skipped: number;
  errors: string[] | null;
  imported_at: string;
}

export interface KVKStatus {
  total: number;
  verified: number;
  districts: string[];
  states: string[];
  last_verified_on: string | null;
  imports: DataImport[];
}

export interface Article {
  id: number;
  author_id: number;
  author_name: string;
  title: string;
  crop: string | null;
  body: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleInput {
  title: string;
  crop?: string | null;
  body: string;
  published?: boolean;
}

// ---- Forum ------------------------------------------------------------------------------------

export const FORUM_CATEGORIES = [
  'general',
  'crops',
  'pests_diseases',
  'soil_water',
  'market',
  'equipment',
  'schemes',
  'other',
] as const;
export type ForumCategory = (typeof FORUM_CATEGORIES)[number];
export type ModerationStatus = 'published' | 'hidden' | 'removed';
export type ReportStatus = 'open' | 'resolved' | 'dismissed';

export interface Author {
  id: number;
  name: string;
  role: Role;
}

export interface ForumReply {
  id: number;
  post_id: number;
  author: Author;
  body: string;
  moderation_status: ModerationStatus;
  created_at: string;
}

export interface ForumPost {
  id: number;
  author: Author;
  title: string;
  body: string;
  category: ForumCategory | null;
  crop: string | null;
  image_path: string | null;
  moderation_status: ModerationStatus;
  reply_count: number;
  created_at: string;
  updated_at: string;
}

export interface ForumPostDetail extends ForumPost {
  replies: ForumReply[];
}

export interface ForumPostInput {
  title: string;
  body: string;
  category: ForumCategory;
  crop?: string | null;
  image_path?: string | null;
}

export interface ForumReport {
  id: number;
  reporter: Author;
  reason: string;
  status: ReportStatus;
  created_at: string;
  resolved_at: string | null;
  target_type: 'post' | 'reply';
  target_id: number;
  post_id: number;
  target_title: string | null;
  target_body: string;
  target_author: Author;
  target_status: ModerationStatus;
}

export interface NotificationPage extends Page<Notification> {
  unread: number;
}

// ---- Farm: fields and ledger -----------------------------------------------------------------

export interface FieldPlot {
  id: number;
  name: string;
  area_acres: number;
  soil_type: string | null;
  irrigation_source: string | null;
  current_crop: string | null;
  /** Crop-calendar season key, e.g. "kharif", "rabi", "suru". */
  season?: string | null;
  sowing_date: string | null;
  lat: number | null;
  lon: number | null;
  created_at: string;
}

export type FieldInput = Partial<Omit<FieldPlot, 'id' | 'created_at'>> & Pick<FieldPlot, 'name' | 'area_acres'>;

export type LedgerType = 'income' | 'expense';
export const EXPENSE_CATEGORIES = [
  'seeds',
  'fertilizer',
  'pesticide',
  'farm_inputs',
  'labour',
  'equipment_rental',
  'irrigation_power',
  'fuel',
  'transport',
  'other_expense',
] as const;
export const INCOME_CATEGORIES = ['crop_sale', 'subsidy', 'other_income'] as const;
export type LedgerCategory = (typeof EXPENSE_CATEGORIES)[number] | (typeof INCOME_CATEGORIES)[number];

export interface LedgerEntry {
  id: number;
  entry_date: string;
  type: LedgerType;
  category: LedgerCategory;
  amount_inr: number;
  field_id: number | null;
  field_name: string | null;
  note: string | null;
  order_id: number | null;
  booking_id: number | null;
  created_at: string;
}

export interface LedgerInput {
  entry_date: string;
  type: LedgerType;
  category: LedgerCategory;
  amount_inr: number;
  field_id?: number | null;
  note?: string | null;
}

export interface LedgerSummary {
  date_from: string | null;
  date_to: string | null;
  income: number;
  expense: number;
  net: number;
  entries: number;
  by_month: { month: string; income: number; expense: number }[];
  by_category: { type: LedgerType; category: LedgerCategory; amount: number }[];
  by_field: { field_id: number | null; field_name: string | null; income: number; expense: number }[];
}

// ---- Dashboards and analytics --------------------------------------------------------------

export interface DayPoint {
  date: string;
  count: number;
  value: number;
}

export interface ResponseTimes {
  responded: number;
  median_hours: number | null;
  average_hours: number | null;
}

export interface FarmerDashboardData {
  fields: number;
  total_acres: number;
  open_orders: number;
  recent_orders: Order[];
  upcoming_bookings_count: number;
  upcoming_bookings: Booking[];
  open_consultations: number;
  unread_notifications: number;
  month: string;
  month_income: number;
  month_expense: number;
}

export interface VendorDashboardData {
  products_total: number;
  products_active: number;
  low_stock: { id: number; name: string; unit: string; stock: number }[];
  out_of_stock: number;
  orders_by_status: Partial<Record<OrderStatus, number>>;
  open_orders: number;
  revenue_total: number;
  revenue_this_month: number;
  month: string;
  orders_last_30_days: DayPoint[];
  top_products: { name: string; quantity: number; revenue: number }[];
  recent_orders: Order[];
}

export interface HardwareDashboardData {
  equipment_total: number;
  equipment_active: number;
  bookings_by_status: Partial<Record<BookingStatus, number>>;
  pending_requests: number;
  revenue_total: number;
  revenue_this_month: number;
  month: string;
  utilisation: { equipment_id: number; name: string; booked_days: number; days: number; share: number }[];
  utilisation_overall: number | null;
  requests_last_30_days: DayPoint[];
  upcoming: Booking[];
}

export interface ExpertDashboardData {
  open_unassigned: number;
  waiting_for_me: number;
  answered_by_me: number;
  closed_by_me: number;
  response_times: ResponseTimes;
  articles_published: number;
  articles_draft: number;
  recent: Consultation[];
}

export interface AdminAnalyticsData {
  users_by_role: Partial<Record<Role, number>>;
  users_by_status: Partial<Record<UserStatus, number>>;
  pending_approvals: number;
  new_users_last_30_days: DayPoint[];
  orders_by_status: Partial<Record<OrderStatus, number>>;
  orders_last_30_days: DayPoint[];
  delivered_order_value: number;
  bookings_by_status: Partial<Record<BookingStatus, number>>;
  completed_rental_value: number;
  consultations_by_status: Partial<Record<ConsultationStatus, number>>;
  response_times: ResponseTimes;
  forum_posts: number;
  forum_replies: number;
  open_reports: number;
  hidden_items: number;
  kvks: number;
  articles_published: number;
  products_active: number;
  equipment_active: number;
}

export interface ModelEvaluation {
  id: number;
  model_name: string;
  version: string;
  dataset: string;
  metric_name: string;
  value: number;
  evaluated_at: string;
  details: Record<string, unknown> | null;
}
