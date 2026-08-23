// utils/appointmentWorkflow.ts
//
// Single source of truth for the automatic appointment scheduling workflow.
//
// A job order follows ONE fixed fitting journey:
//   Consultation → First Fitting → Final Fitting → Pickup → Completed
//
// Rules enforced here (shared by every scheduling screen):
// 1. A job order has at most ONE live appointment. Scheduling again for the
//    same job order UPDATES that existing record (new date/time + next stage)
//    instead of creating a duplicate row.
// 2. The fitting stage is never chosen by the user. It is derived
//    automatically: the first booking for a job order starts at Consultation,
//    and every later booking moves to the stage that follows the furthest
//    visit already on record.
//
// Scope guard: pure helpers only — no fetching, no side effects.

import type { Appointment } from '../../services/frontDeskApi';
import { ACTIVE_APPOINTMENT_STATUSES, appointmentTimestamp } from './appointmentDisplay';

/** The fixed fitting journey every job order walks through, in order. */
export const FITTING_JOURNEY = ['Consultation', 'First Fitting', 'Final Fitting', 'Pickup'] as const;
export type FittingStage = (typeof FITTING_JOURNEY)[number];

/** Terminal state reached after the Pickup visit is completed. */
export const JOURNEY_COMPLETE = 'Completed';

/** Business rule: a brand-new job order always starts here. */
export const FIRST_VISIT_STAGE: FittingStage = 'Consultation';

/**
 * Stage that follows the given one.
 * Consultation → First Fitting → Final Fitting → Pickup; after Pickup the
 * journey is finished (mark it Completed) so null is returned.
 */
export function nextFittingStage(stage: string): FittingStage | null {
  const index = FITTING_JOURNEY.indexOf(stage as FittingStage);
  if (index === -1 || index === FITTING_JOURNEY.length - 1) return null;
  return FITTING_JOURNEY[index + 1];
}

/**
 * The job order's single live appointment (Scheduled / Confirmed /
 * Rescheduled), if one exists. The latest one wins when legacy duplicates
 * are present.
 *
 * `jobOrOrderId` accepts EITHER the job card number OR the order id —
 * scheduling screens pass whichever identifier they have on hand.
 */
export function findActiveAppointmentForJob(
  appointments: Appointment[],
  jobCardId: string
): Appointment | null {
  if (!jobCardId) return null;
  let latest: Appointment | null = null;
  for (const appt of appointments) {
    if (appt.job_card_id !== jobCardId && appt.order_id !== jobCardId) continue;
    if (!ACTIVE_APPOINTMENT_STATUSES.has(appt.status)) continue;
    if (!latest || appointmentTimestamp(appt) >= appointmentTimestamp(latest)) latest = appt;
  }
  return latest;
}

/** Furthest fitting stage recorded for this job order (completed visits count). */
export function furthestStageForJob(appointments: Appointment[], jobCardId: string): FittingStage | null {
  let furthestIndex = -1;
  for (const appt of appointments) {
    if ((appt.job_card_id !== jobCardId && appt.order_id !== jobCardId) || appt.status === 'Cancelled') continue;
    const index = FITTING_JOURNEY.indexOf(appt.appointment_type as FittingStage);
    if (index > furthestIndex) furthestIndex = index;
  }
  return furthestIndex >= 0 ? FITTING_JOURNEY[furthestIndex] : null;
}

/**
 * The stage the next booking for this job order should use — decided
 * automatically, with no user selection:
 * - No visits yet            → Consultation (first-visit business rule).
 * - Visits already on record → the stage AFTER the furthest one reached
 *                              (Consultation → First Fitting → Final Fitting →
 *                              Pickup). Null once Pickup is reached, meaning
 *                              the journey is complete.
 */
export function determineStageForJob(appointments: Appointment[], jobCardId: string): FittingStage | null {
  if (!jobCardId) return null;
  const furthest = furthestStageForJob(appointments, jobCardId);
  if (!furthest) return FIRST_VISIT_STAGE;
  return nextFittingStage(furthest);
}