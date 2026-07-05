import { redirect } from "next/navigation";

/**
 * Billing moved into Settings. Keep this path working (old links, bookmarks,
 * the user menu) by redirecting to the Settings surface where billing now
 * lives.
 */
export default function BillingPage() {
  redirect("/dashboard/settings");
}
