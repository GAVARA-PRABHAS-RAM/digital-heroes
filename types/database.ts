/**
 * Digital Heroes - Concrete Database Entity Types (Stage 2)
 * Aligned with Supabase SQL Schema and PRD Requirements.
 */

export type UserRole = "subscriber" | "admin";
export type SubscriptionPlan = "monthly" | "yearly";
export type SubscriptionTier = SubscriptionPlan;
export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "cancelled"
  | "canceled"
  | "past_due"
  | "lapsed"
  | "incomplete"
  | "trialing";
export type DrawType = "random" | "algorithmic";
export type DrawStatus = "draft" | "simulated" | "published" | "completed";
export type PrizeTier = 5 | 4 | 3;
export type VerificationStatus = "pending" | "approved" | "rejected";
export type PaymentStatus = "pending" | "paid";
export type DonationType = "subscription" | "independent";

/**
 * 1. Profiles
 * Extends auth.users(id)
 */
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

/**
 * 2. Subscriptions
 */
export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id?: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  price: number;
  currency: string;
  start_date: string;
  renewal_date: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  cancelled_at: string | null;
  canceled_at?: string | null;
  created_at: string;
}

/**
 * 3. Scores (Stableford 1-45 format)
 */
export interface Score {
  id: string;
  user_id: string;
  score: number;
  score_date: string;
  created_at: string;
  updated_at: string;
}

/**
 * 4. Charities
 */
export interface Charity {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  website_url: string | null;
  featured: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 5. Charity Events
 */
export interface CharityEvent {
  id: string;
  charity_id: string;
  title: string;
  description: string;
  event_date: string;
  location: string | null;
  created_at: string;
}

/**
 * 6. User Charities
 */
export interface UserCharity {
  id: string;
  user_id: string;
  charity_id: string;
  contribution_percentage: number;
  created_at: string;
  updated_at: string;
}

/**
 * 7. Draws
 */
export interface Draw {
  id: string;
  draw_month: string;
  draw_type: DrawType;
  status: DrawStatus;
  draw_number: string | null;
  created_at: string;
  simulated_at: string | null;
  published_at: string | null;
}

/**
 * 8. Draw Entries
 */
export interface DrawEntry {
  id: string;
  draw_id: string;
  user_id: string;
  numbers: number[];
  created_at: string;
}

/**
 * 9. Draw Results
 */
export interface DrawResult {
  id: string;
  draw_id: string;
  winning_numbers: number[];
  generated_by: string;
  created_at: string;
}

/**
 * 10. Prizes
 */
export interface Prize {
  id: string;
  draw_id: string;
  tier: PrizeTier;
  pool_percentage: number;
  pool_amount: number;
  winner_count: number;
  amount_per_winner: number;
  rollover_amount: number;
}

/**
 * 11. Winners
 */
export interface Winner {
  id: string;
  draw_id: string;
  user_id: string;
  prize_id: string;
  match_count: number;
  prize_amount: number;
  verification_status: VerificationStatus;
  payment_status: PaymentStatus;
  created_at: string;
}

/**
 * 12. Winner Proofs
 */
export interface WinnerProof {
  id: string;
  winner_id: string;
  file_url: string;
  status: VerificationStatus;
  uploaded_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
}

/**
 * 13. Payouts
 */
export interface Payout {
  id: string;
  winner_id: string;
  amount: number;
  status: PaymentStatus;
  paid_at: string | null;
  created_at: string;
}

/**
 * 14. Donations
 */
export interface Donation {
  id: string;
  user_id: string;
  charity_id: string;
  subscription_id: string | null;
  amount: number;
  percentage: number;
  type: DonationType;
  status: string;
  created_at: string;
}
