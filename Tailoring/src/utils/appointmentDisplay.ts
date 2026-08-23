// utils/appointmentDisplay.ts
//
// UI-layer helpers that decide WHICH appointment records the interface should
// render for the fitting calendar.
//
// Display rule: ONE appointment row per Job Order. A job order has a single
// live booking at any time — as it progresses through the fitting journey the
// existing record is updated (see utils/appointmentWorkflow.ts), never
// duplicated. These helpers collapse any legacy duplicate rows so the calendar
// always shows at most one live visit per job order, while keeping Completed
// and Cancelled history traceable.
//
// Scope guard: these helpers never create, update or delete appointments and
// never touch the database, the API layer, or any business rule. They only
// shape data that has already been loaded for display.

import type { Appointment } from '../../services/frontDeskApi';

/** Statuses that represent a live/upcoming booking rather than finished history. */
export const ACTIVE_APPOINTMENT_STATUSES: ReadonlySet<string> = new Set([
  'Scheduled',
  'Confirmed',
  'Rescheduled',
]);

/** Parse an appointment's date + time into a comparable timestamp (ms). */
export function appointmentTimestamp(
  a: Pick<Appointment, 'appointment_date' | 'appointment_time' | 'created_at'>
): number {
  const ms = new Date(`${a.appointment_date}T${(a.appointment_time || '00:00').slice(0, 5)}`).getTime();
  if (Number.isFinite(ms)) return ms;
  const created = new Date(a.created_at || '').getTime();
  return Number.isFinite(created) ? created : 0;
}

/**
 * Stable identity for an appointment record.
 * The appointment record ID is the primary identifier — never the customer
 * name. When a malformed row arrives without an ID, fall back to its full
 * business signature so it still cannot be confused with another record.
 */
export function appointmentRecordKey(a: Appointment): string {
  if (a.appointment_id) return String(a.appointment_id);
  return [a.customer_id, a.job_card_id, a.appointment_date, a.appointment_time, a.appointment_type, a.status].join('|');
}

/**
 * Resolve the list of appointments the UI should render.
 *
 * 1. Exact duplicates — if the backend accidentally returns the same record
 *    twice (same appointment ID), it is rendered only once.
 * 2. One live visit per job order — only the latest active (Scheduled /
 *    Confirmed / Rescheduled) appointment is shown per job card, so the
 *    fitting calendar displays a single row per Job Order. Completed and
 *    Cancelled history is always preserved so past visits remain traceable.
 *
 * The result is sorted chronologically.
 */
export function dedupeAppointments(list: Appointment[]): Appointment[] {
  // Pass 1 — collapse exact record duplicates by appointment record ID.
  const byId = new Map<string, Appointment>();
  for (const appt of list) {
    const key = appointmentRecordKey(appt);
    const existing = byId.get(key);
    if (!existing || appointmentTimestamp(appt) >= appointmentTimestamp(existing)) {
      byId.set(key, appt);
    }
  }
  const unique = Array.from(byId.values());

  // Pass 2 — keep only the latest ACTIVE appointment per job order.
  const latestActive = new Map<string, Appointment>();
  for (const appt of unique) {
    if (!ACTIVE_APPOINTMENT_STATUSES.has(appt.status)) continue;
    const current = latestActive.get(appt.job_card_id);
    if (!current || appointmentTimestamp(appt) >= appointmentTimestamp(current)) {
      latestActive.set(appt.job_card_id, appt);
    }
  }

  return unique
    .filter((appt) => {
      if (!ACTIVE_APPOINTMENT_STATUSES.has(appt.status)) return true; // history always stays
      return latestActive.get(appt.job_card_id) === appt;
    })
    .sort((a, b) => appointmentTimestamp(a) - appointmentTimestamp(b));
}

/** Tailwind class tokens for the fitting-stage chip, keyed by appointment type. */
export const STAGE_BADGE_STYLES: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  Consultation: { border: 'border-[#E3CFA3]', bg: 'bg-[#FBF3DF]', text: 'text-[#8A6618]', dot: 'bg-[#C9A15C]' },
  'First Fitting': { border: 'border-[#E4C1AC]', bg: 'bg-[#FAEBE2]', text: 'text-[#9E5B4B]', dot: 'bg-[#A46B48]' },
  'Second Fitting': { border: 'border-[#E0CBB0]', bg: 'bg-[#F7EEE0]', text: 'text-[#8A6618]', dot: 'bg-[#B89255]' },
  'Final Fitting': { border: 'border-[#D9CBA6]', bg: 'bg-[#F5EFDE]', text: 'text-[#6E5F2E]', dot: 'bg-[#8C6F3E]' },
  Pickup: { border: 'border-[#B9DDD0]', bg: 'bg-[#E7F4EE]', text: 'text-[#277257]', dot: 'bg-[#4E7357]' },
};

/** Style tokens for a fitting stage, with a neutral fallback for custom types. */
export function stageBadgeStyle(type: string): { border: string; bg: string; text: string; dot: string } {
  return STAGE_BADGE_STYLES[type] || { border: 'border-[#D9C8B7]', bg: 'bg-[#F8F3EB]', text: 'text-[#766A62]', dot: 'bg-[#766A62]' };
}