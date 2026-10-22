/**
 * Demo data. Every person here is fictional: names are deliberately silly,
 * emails use the reserved example.com domain and phone numbers use the
 * 555-01xx range set aside for fiction.
 *
 * Dates are generated relative to `now`, so the demo always looks current,
 * and a fixed PRNG seed makes the output identical for a given `now`.
 */
import { setHours, subDays } from 'date-fns';
import { createRng, type Rng } from '../lib/random';
import { addDaysIso, toIsoDate } from '../lib/dates';
import {
  CURRENT_SCHEMA_VERSION,
  type CheckIn,
  type Client,
  type Dataset,
  type Goal,
  type LeadSource,
  type ProgramTier,
  type ProgressLog,
  type Stage,
  type Targets,
} from '../schemas';

const SEED = 20261020;

interface LogProfile {
  /** Days before today the first log was written. */
  startDaysAgo: number;
  /** Days before today the last log was written (0 = logged today). */
  endDaysAgo: number;
  startWeightLbs: number;
  weeklyChangeLbs: number;
  /** 0–1. Drives how close calories, protein and steps land to target. */
  adherence: number;
  /** Probability of skipping a day entirely. */
  missRate: number;
}

interface ClientSpec {
  slug: string;
  name: string;
  email?: string;
  phone?: string;
  leadSource: LeadSource;
  programTier: ProgramTier;
  goal: Goal;
  targets: Targets;
  notes: string;
  /** Stage path with days-ago for each transition; last entry is the current stage. */
  history: Array<[Stage, number]>;
  logs?: LogProfile;
  /** Days from today until the next check-in (negative = overdue). */
  nextCheckInInDays?: number;
  /** The latest check-in was sent from the client portal and still needs the coach's reply. */
  awaitingReply?: boolean;
}

const SPECS: ClientSpec[] = [
  {
    slug: 'testy-mcliftface',
    name: 'Testy McLiftface',
    email: 'testy@example.com',
    phone: '555-0101',
    leadSource: 'referral',
    programTier: 'tier_2',
    goal: 'fat_loss',
    targets: { calories: 2100, proteinG: 180, carbsG: 190, fatG: 70, dailySteps: 10000, goalWeightLbs: 185 },
    notes: 'Referred by a (fictional) gym buddy. Trains 4x/week before work. Responds best to text check-ins.',
    history: [['lead', 110], ['consult', 104], ['active', 84]],
    logs: { startDaysAgo: 83, endDaysAgo: 0, startWeightLbs: 204, weeklyChangeLbs: -1.1, adherence: 0.85, missRate: 0.06 },
    nextCheckInInDays: 2,
    awaitingReply: true,
  },
  {
    slug: 'sample-sally-squats',
    name: 'Sample Sally Squats',
    email: 'sally.squats@example.com',
    leadSource: 'social',
    programTier: 'tier_1',
    goal: 'muscle_gain',
    targets: { calories: 2300, proteinG: 140, carbsG: 280, fatG: 70, dailySteps: 8000, goalWeightLbs: 140 },
    notes: 'Found us via a demo reel. First structured lifting program. Wants a 200 lb squat.',
    history: [['lead', 95], ['consult', 90], ['beta', 84], ['active', 56]],
    logs: { startDaysAgo: 77, endDaysAgo: 1, startWeightLbs: 131, weeklyChangeLbs: 0.35, adherence: 0.75, missRate: 0.1 },
    nextCheckInInDays: 4,
    awaitingReply: true,
  },
  {
    slug: 'placeholder-priya-press',
    name: 'Placeholder Priya Press',
    email: 'priya.press@example.com',
    phone: '555-0103',
    leadSource: 'email_list',
    programTier: 'tier_3',
    goal: 'recomp',
    targets: { calories: 1900, proteinG: 150, carbsG: 180, fatG: 65, dailySteps: 9000, goalWeightLbs: 150 },
    notes: 'Newsletter subscriber for a year before signing up. Busy season at work — logging has slipped.',
    history: [['lead', 80], ['consult', 76], ['active', 63]],
    // Last log 4 days ago, so the dashboard flags her for follow-up.
    logs: { startDaysAgo: 63, endDaysAgo: 4, startWeightLbs: 158, weeklyChangeLbs: -0.4, adherence: 0.55, missRate: 0.18 },
    nextCheckInInDays: -2,
  },
  {
    slug: 'fakey-mcfakerson',
    name: 'Fakey McFakerson',
    email: 'fakey@example.com',
    leadSource: 'social',
    programTier: 'beta',
    goal: 'fat_loss',
    targets: { calories: 2400, proteinG: 190, carbsG: 230, fatG: 80, dailySteps: 12000, goalWeightLbs: 215 },
    notes: 'Beta cohort. Gives great feedback on the logging flow. Decide on tier upgrade at week 10.',
    history: [['lead', 70], ['consult', 63], ['beta', 56]],
    logs: { startDaysAgo: 56, endDaysAgo: 0, startWeightLbs: 236, weeklyChangeLbs: -1.4, adherence: 0.7, missRate: 0.08 },
    nextCheckInInDays: 1,
  },
  {
    slug: 'demo-dan-deadlift',
    name: 'Demo Dan Deadlift',
    phone: '555-0105',
    leadSource: 'gym',
    programTier: 'tier_1',
    goal: 'muscle_gain',
    targets: { calories: 2800, proteinG: 170, carbsG: 330, fatG: 85, dailySteps: 7000, goalWeightLbs: 175 },
    notes: 'Met at the gym. Paused for a work trip; plans to resume next month.',
    history: [['lead', 120], ['consult', 115], ['active', 100], ['paused', 18]],
    logs: { startDaysAgo: 100, endDaysAgo: 19, startWeightLbs: 162, weeklyChangeLbs: 0.4, adherence: 0.6, missRate: 0.15 },
  },
  {
    slug: 'example-eddie-endurance',
    name: 'Example Eddie Endurance',
    email: 'eddie@example.com',
    leadSource: 'referral',
    programTier: 'tier_1',
    goal: 'maintenance',
    targets: { calories: 2600, proteinG: 150, carbsG: 320, fatG: 80, dailySteps: 12000, goalWeightLbs: 170 },
    notes: 'Marathon-focused. Churned after race season; open to coming back in spring.',
    history: [['lead', 150], ['consult', 146], ['active', 135], ['churned', 60]],
  },
  {
    slug: 'mock-morgan-mobility',
    name: 'Mock Morgan Mobility',
    email: 'morgan.mobility@example.com',
    leadSource: 'referral',
    programTier: 'tier_2',
    goal: 'recomp',
    targets: { calories: 2000, proteinG: 150, carbsG: 200, fatG: 65, dailySteps: 9000, goalWeightLbs: 160 },
    notes: 'Consult booked. Main concern is desk-job back stiffness.',
    history: [['lead', 9], ['consult', 3]],
  },
  {
    slug: 'lorem-ipsum-lunges',
    name: 'Lorem Ipsum Lunges',
    leadSource: 'social',
    programTier: 'tier_1',
    goal: 'fat_loss',
    targets: { calories: 1800, proteinG: 130, carbsG: 170, fatG: 60, dailySteps: 8000, goalWeightLbs: 145 },
    notes: 'DM enquiry. Follow up with pricing.',
    history: [['lead', 2]],
  },
];

const COACH_NOTES = {
  high: [
    'Hit protein every day. Lifts moving up nicely.',
    'Great week — consistent logging and steps above target.',
    'Sleep improved and training energy is up.',
  ],
  mid: [
    'Solid weekdays, weekends drifted over on calories.',
    'Steps dipped mid-week; travel days were the issue.',
    'Protein a bit low on rest days.',
  ],
  low: [
    'Rough week — missed several logs and two sessions.',
    'Stress at work; we simplified the plan for now.',
    'Calories inconsistent. Agreed to log at least weight daily.',
  ],
} as const;

interface ClientAnswers {
  wins: string;
  struggles: string;
  questions: string;
}

/** What clients write when they start a check-in from the portal. */
const CLIENT_ANSWERS: Record<'high' | 'mid' | 'low', ClientAnswers[]> = {
  high: [
    { wins: 'Hit my step goal 6 out of 7 days and logged every meal.', struggles: 'Sunday dinner ran over on calories.', questions: '' },
    { wins: 'New best on squats! Felt strong all week.', struggles: 'Nothing major.', questions: 'Can we add an extra upper-body day?' },
    { wins: 'Meal prep made weekdays easy.', struggles: 'Sleep was a bit short midweek.', questions: '' },
  ],
  mid: [
    { wins: 'Weekdays were on point.', struggles: 'Weekends are still tough — two takeaway meals.', questions: 'Any tips for eating out?' },
    { wins: 'Kept training 3x even with a busy week.', struggles: 'Steps dropped on office days.', questions: '' },
  ],
  low: [
    { wins: 'Still made it to the gym twice.', struggles: 'Work stress, skipped logging most days.', questions: 'Could we simplify the plan for a couple of weeks?' },
    { wins: 'Weighed in most mornings.', struggles: 'Late-night snacking.', questions: '' },
  ],
};

/** Check-ins from roughly the last month came in through the client portal. */
const PORTAL_LAUNCHED_DAYS_AGO = 28;

const NEXT_ACTIONS = [
  'Add a 10-minute walk after lunch.',
  'Prep protein-forward lunches on Sunday.',
  'Keep the current plan; add 5 lb to main lifts.',
  'Log weight every morning, even on off days.',
  'Swap evening snack for a higher-protein option.',
  'Book next check-in and send updated program.',
];

export function buildSeedDataset(now: Date = new Date()): Dataset {
  const rng = createRng(SEED);
  const today = toIsoDate(now);
  const timestamp = (daysAgo: number) => setHours(subDays(now, daysAgo), 10).toISOString();

  const clients: Client[] = [];
  const progressLogs: ProgressLog[] = [];
  const checkIns: CheckIn[] = [];

  for (const spec of SPECS) {
    const id = `client-${spec.slug}`;
    const [currentStage] = spec.history[spec.history.length - 1]!;
    const firstStartedDaysAgo = spec.history.find(([stage]) => stage === 'beta' || stage === 'active')?.[1];

    clients.push({
      id,
      name: spec.name,
      email: spec.email,
      phone: spec.phone,
      leadSource: spec.leadSource,
      stage: currentStage,
      stageHistory: spec.history.map(([stage, daysAgo]) => ({ stage, enteredAt: timestamp(daysAgo) })),
      startDate: firstStartedDaysAgo === undefined ? undefined : toIsoDate(subDays(now, firstStartedDaysAgo)),
      programTier: spec.programTier,
      nextCheckInDate: spec.nextCheckInInDays === undefined ? undefined : addDaysIso(today, spec.nextCheckInInDays),
      goal: spec.goal,
      targets: spec.targets,
      notes: spec.notes,
      createdAt: timestamp(spec.history[0]![1]),
      updatedAt: now.toISOString(),
    });

    if (spec.logs) {
      progressLogs.push(...generateLogs(rng, id, spec.targets, spec.logs, now));
      checkIns.push(...generateCheckIns(rng, id, spec, now));
    }
  }

  return { schemaVersion: CURRENT_SCHEMA_VERSION, clients, progressLogs, checkIns };
}

function generateLogs(rng: Rng, clientId: string, targets: Targets, profile: LogProfile, now: Date): ProgressLog[] {
  const logs: ProgressLog[] = [];
  const dailyChange = profile.weeklyChangeLbs / 7;
  // Water weight drifts over a few days rather than jumping independently each day.
  let waterWeight = 0;

  for (let daysAgo = profile.startDaysAgo; daysAgo >= profile.endDaysAgo; daysAgo--) {
    const dayIndex = profile.startDaysAgo - daysAgo;
    waterWeight = 0.6 * waterWeight + rng.normal(0, 0.7);
    // Always keep the first and last day so the date range is exactly as specified.
    const isEdge = daysAgo === profile.startDaysAgo || daysAgo === profile.endDaysAgo;
    if (!isEdge && rng.chance(profile.missRate)) continue;

    const date = toIsoDate(subDays(now, daysAgo));
    const weekday = subDays(now, daysAgo).getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const slack = 1 - profile.adherence;

    // Weekends run higher; low adherence means larger, more biased misses.
    const calorieFactor = 1 + rng.normal(slack * 0.12, 0.04 + slack * 0.15) + (isWeekend ? slack * 0.2 : 0);
    const calories = Math.round(targets.calories * calorieFactor);
    const proteinG = Math.round(targets.proteinG * clamp(rng.normal(0.85 + profile.adherence * 0.15, 0.08), 0.4, 1.3));
    const fatG = Math.round(targets.fatG * clamp(calorieFactor + rng.normal(0, 0.08), 0.4, 1.8));
    const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
    const steps = Math.max(
      500,
      Math.round(targets.dailySteps * clamp(rng.normal(0.8 + profile.adherence * 0.25, 0.18), 0.2, 1.8) * (isWeekend ? 0.9 : 1)),
    );

    // Some days only part of the log gets filled in.
    const loggedWeight = rng.chance(0.92);
    const loggedFood = rng.chance(0.4 + profile.adherence * 0.55);
    const loggedSteps = rng.chance(0.95);

    logs.push({
      id: `log-${clientId}-${date}`,
      clientId,
      date,
      weightLbs: loggedWeight ? round1(profile.startWeightLbs + dailyChange * dayIndex + waterWeight) : undefined,
      calories: loggedFood ? calories : undefined,
      proteinG: loggedFood ? proteinG : undefined,
      carbsG: loggedFood ? carbsG : undefined,
      fatG: loggedFood ? fatG : undefined,
      steps: loggedSteps ? steps : undefined,
      note: rng.chance(0.06) ? rng.pick(['Felt great today', 'Long day at work', 'Big family dinner', 'Leg day 🔥', 'Slept badly']) : undefined,
    });
  }
  return logs;
}

function generateCheckIns(rng: Rng, clientId: string, spec: ClientSpec, now: Date): CheckIn[] {
  const profile = spec.logs!;
  const checkIns: CheckIn[] = [];
  // Weekly check-ins from the end of week one until logging stopped, aligned so the
  // most recent one is 7 days before the next scheduled check-in.
  const lastDaysAgo = spec.nextCheckInInDays === undefined ? profile.endDaysAgo : 7 - spec.nextCheckInInDays;

  for (let daysAgo = lastDaysAgo; daysAgo <= profile.startDaysAgo - 7; daysAgo += 7) {
    const rating = clamp(Math.round(rng.normal(1 + profile.adherence * 4, 0.7)), 1, 5);
    const band = rating >= 4 ? 'high' : rating === 3 ? 'mid' : 'low';
    const fromPortal = daysAgo <= PORTAL_LAUNCHED_DAYS_AGO;
    const awaiting = Boolean(spec.awaitingReply) && daysAgo === lastDaysAgo;
    // Rotate through the sample answers so consecutive weeks read differently.
    const options = CLIENT_ANSWERS[band];
    const answers = fromPortal ? options[((daysAgo - lastDaysAgo) / 7) % options.length]! : { wins: '', struggles: '', questions: '' };
    checkIns.push({
      id: `checkin-${clientId}-${daysAgo}`,
      clientId,
      date: toIsoDate(subDays(now, daysAgo)),
      adherenceRating: rating,
      ...answers,
      coachNotes: awaiting ? '' : rng.pick(COACH_NOTES[band]),
      nextActions: awaiting ? '' : rng.pick(NEXT_ACTIONS),
      submittedBy: fromPortal ? 'client' : 'coach',
      status: awaiting ? 'awaiting_coach' : 'complete',
    });
  }
  return checkIns.reverse();
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round1 = (value: number) => Math.round(value * 10) / 10;
