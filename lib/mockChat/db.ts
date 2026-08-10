import type {
  Attachment,
  Project,
  ProjectMember,
  ProjectMessage,
  ProjectRole,
  User,
} from "./types";
import { imagePlaceholderDataUrl } from "./assets";

/* ---------------------------------------------------------------------------
 * Time helpers (ISO timestamps relative to "now")
 * ------------------------------------------------------------------------ */

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Milliseconds before now (numeric so offsets can be combined). */
function ago(ms: number): number {
  return Date.now() - ms;
}

const mins = (n: number) => ago(n * MIN);
const hours = (n: number) => ago(n * HOUR);
const days = (n: number) => ago(n * DAY);

/** The signed-in user for the demo session. */
export const CURRENT_USER_ID = "u1";

/* ---------------------------------------------------------------------------
 * Users
 * ------------------------------------------------------------------------ */

export const users: User[] = [
  { id: "u1", fullName: "Aiman Hakim", email: "aiman.hakim@buildpro.my", role: "Developer" },
  { id: "u2", fullName: "Nurul Aisyah", email: "nurul.aisyah@gbi.org.my", role: "GBI Facilitator" },
  { id: "u3", fullName: "Daniel Tan", email: "daniel.tan@archform.my", role: "Architect" },
  { id: "u4", fullName: "Lim Wei Jie", email: "weijie.lim@structek.my", role: "Engineer" },
  { id: "u5", fullName: "Priya Krishnan", email: "priya.krishnan@qsmaster.my", role: "Quantity Surveyor" },
  { id: "u6", fullName: "Marcus Lee", email: "marcus.lee@buildpro.my", role: "Project Manager" },
  { id: "u7", fullName: "Sofia Rahman", email: "sofia.rahman@archform.my", role: "Architect" },
  { id: "u8", fullName: "Kevin Ooi", email: "kevin.ooi@mepconsult.my", role: "Engineer" },
  { id: "u9", fullName: "Amirah Zain", email: "amirah.zain@gbi.org.my", role: "GBI Facilitator" },
  { id: "u10", fullName: "Jeremy Ng", email: "jeremy.ng@qsmaster.my", role: "Quantity Surveyor" },
  { id: "u11", fullName: "Farah Ismail", email: "farah.ismail@nusantara.dev", role: "Developer" },
  { id: "u12", fullName: "Hafiz Rahman", email: "hafiz.rahman@nusantara.dev", role: "Project Manager" },
  { id: "u13", fullName: "Rachel Chong", email: "rachel.chong@archform.my", role: "Architect" },
  { id: "u14", fullName: "Vikram Singh", email: "vikram.singh@structek.my", role: "Engineer" },
  { id: "u15", fullName: "Mei Ling", email: "mei.ling@qsmaster.my", role: "Quantity Surveyor" },
  { id: "u16", fullName: "Adam Johari", email: "adam.johari@gbi.org.my", role: "GBI Facilitator" },
  { id: "u17", fullName: "Chloe Wong", email: "chloe.wong@buildpro.my", role: "Developer" },
  { id: "u18", fullName: "Ryan Lim", email: "ryan.lim@mepconsult.my", role: "Engineer" },
];

const userById = new Map(users.map((u) => [u.id, u]));

/* ---------------------------------------------------------------------------
 * Projects
 * ------------------------------------------------------------------------ */

export const projects: Project[] = [
  { id: 1, name: "Riverbend Office Tower", userId: "u1" },
  { id: 2, name: "Green Meadows Residences", userId: "u2" },
  { id: 3, name: "Cedar Hills International School", userId: "u6" },
];

/* ---------------------------------------------------------------------------
 * Project members
 * ------------------------------------------------------------------------ */

let memberSeq = 0;
const member = (
  projectId: number,
  userId: string,
  addedBy: string,
  role: ProjectRole = "member",
): ProjectMember => ({
  id: `pm-${++memberSeq}`,
  projectId,
  userId,
  addedBy,
  role,
  createdAt: new Date(days(20)).toISOString(),
});

export const projectMembers: ProjectMember[] = [
  // Project 1 — Riverbend Office Tower (owner: u1)
  member(1, "u1", "u1", "gbi_facilitator"),
  member(1, "u2", "u1", "gbi_facilitator"),
  member(1, "u3", "u1", "member"),
  member(1, "u4", "u1", "member"),
  member(1, "u5", "u1", "quantity_surveyor"),
  member(1, "u6", "u1", "developer"),
  member(1, "u7", "u1", "member"),
  member(1, "u8", "u1", "member"),

  // Project 2 — Green Meadows Residences (owner: u2)
  member(2, "u2", "u2", "gbi_facilitator"),
  member(2, "u1", "u2", "developer"),
  member(2, "u9", "u2", "gbi_facilitator"),
  member(2, "u10", "u2", "quantity_surveyor"),
  member(2, "u11", "u2", "developer"),
  member(2, "u12", "u2", "member"),
  member(2, "u13", "u2", "member"),

  // Project 3 — Cedar Hills International School (owner: u6)
  member(3, "u6", "u6", "gbi_facilitator"),
  member(3, "u1", "u6", "developer"),
  member(3, "u9", "u6", "gbi_facilitator"),
  member(3, "u14", "u6", "member"),
  member(3, "u15", "u6", "quantity_surveyor"),
  member(3, "u16", "u6", "gbi_facilitator"),
  member(3, "u17", "u6", "developer"),
  member(3, "u18", "u6", "member"),
];

/* ---------------------------------------------------------------------------
 * Attachments
 * ------------------------------------------------------------------------ */

const att = (
  id: string,
  filename: string,
  mimeType: string,
  kind: Attachment["kind"],
  size: number,
  uploadedBy: string,
): Attachment => ({
  id,
  filename,
  mimeType,
  kind,
  size,
  uploadedBy,
  uploadedAt: new Date(days(3)).toISOString(),
  url: kind === "image" ? imagePlaceholderDataUrl(id, filename) : null,
});

export const attachments: Attachment[] = [
  att("att-img-1", "facade_design_v2.webp", "image/webp", "image", 1_842_000, "u3"),
  att("att-img-2", "site_layout_rev3.png", "image/png", "image", 3_120_000, "u3"),
  att("att-img-3", "lobby_rendering.jpg", "image/jpeg", "image", 2_456_000, "u7"),
  att("att-pdf-1", "GBI_NRNC_Checklist.pdf", "application/pdf", "pdf", 486_000, "u2"),
  att("att-pdf-2", "Material_Specs_Rev2.pdf", "application/pdf", "pdf", 1_024_000, "u4"),
  att("att-pdf-3", "Energy_Model_Report.pdf", "application/pdf", "pdf", 782_000, "u8"),
  att("att-xls-1", "cost_breakdown.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "spreadsheet", 214_000, "u5"),
  att("att-xls-2", "material_schedule.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "spreadsheet", 158_000, "u10"),
];

/* ---------------------------------------------------------------------------
 * Messages
 * ------------------------------------------------------------------------ */

let msgSeq = 0;
const msg = (
  projectId: number,
  senderId: string,
  message: string,
  createdAtMs: number,
  attachment?: Attachment | null,
): ProjectMessage => ({
  id: `m-${++msgSeq}`,
  projectId,
  senderId,
  message,
  attachment: attachment ?? null,
  replyToId: null,
  createdAt: new Date(createdAtMs).toISOString(),
});

export const projectMessages: ProjectMessage[] = [
  // ── Project 1 · Riverbend Office Tower ─────────────────────────────
  msg(1, "u6", "Morning all. Kicking off the Riverbend coordination thread. We need the facade package and the GBI checklist aligned before the design freeze next Friday.", days(8), null),
  msg(1, "u1", "Thanks Marcus. I'll lock the owner requirements doc today so the team has a single source of truth.", days(8), null),
  msg(1, "u3", "Dropping the updated facade design — revised glazing ratio to lift the daylight factor without pushing solar heat gain over the cap.", days(7) + hours(2) + mins(10), null),
  msg(1, "u3", "Here's the V2 facade for review. The F1 spandrel band now uses a lower SHGC glass while keeping the 2.4m vision panels.", days(7) + hours(2) + mins(5), null),
  msg(1, "u3", "See the rendering attached.", days(7) + hours(2) + mins(12), attachments.find((a) => a.id === "att-img-1") ?? null),
  msg(1, "u2", "Reviewed the glazing — daylight factor is now 3.1% in the open plan which is comfortable for NRNC. Watch the west elevation afternoon glare.", days(7) + hours(3), null),
  msg(1, "u4", "Structural side is fine with the spandrel change, but confirm the double glazing unit weight won't exceed the curtain wall bracket capacity. I'll run the check.", days(7) + hours(5), null),
  msg(1, "u5", "Added the provisional facade cost to the workbook. It's ~RM 18.4/m² over the original estimate because of the new glass spec.", days(6) + hours(1), null),
  msg(1, "u5", "Full cost breakdown attached — watch the curtain wall line.", days(6) + hours(1) + mins(3), attachments.find((a) => a.id === "att-xls-1") ?? null),
  msg(1, "u1", "Noted on the glass premium. Let's trade it against the mechanical savings from the chiller plant efficiency target.", days(6) + hours(4), null),
  msg(1, "u8", "The energy model suggests a VRF system with a COP 6.2 chiller keeps us inside the NRNC threshold. Report attached.", days(5) + hours(6), attachments.find((a) => a.id === "att-pdf-3") ?? null),
  msg(1, "u2", "Good news — with the chiller upgrade we're tracking toward a provisional Gold. I've pencilled the assessment route.", days(5) + hours(8), null),
  msg(1, "u3", "Sharing the lobby rendering so everyone sees the material language: timber-look acoustic panels and low-VOC paint throughout.", days(4) + hours(2), attachments.find((a) => a.id === "att-img-3") ?? null),
  msg(1, "u4", "Lobby MEP routing is done — the acoustic ceiling void will hold the supply ducts at 180mm, which fits the panel depth.", days(4) + hours(3), null),
  msg(1, "u7", "Quick flag: the bike parking count in the approval doc is 24, but the by-law needs 32. Can we add a row near the service yard?", days(3) + hours(2), null),
  msg(1, "u1", "Good catch Sofia. I'll update the owner requirement doc and share the revised approval sheet.", days(3) + hours(5), null),
  msg(1, "u6", "Reminder — GBI documentation submissions close Thursday. Please upload your section checklists in the portal.", days(3) + hours(8), null),
  msg(1, "u2", "GBI NRNC checklist is up to date. I've attached the consolidated one covering EE, IEQ and SM sections.", days(2) + hours(1), attachments.find((a) => a.id === "att-pdf-1") ?? null),
  msg(1, "u8", "Material specs Rev 2 attached — paints, sealants and insulation all updated to the low-VOC, recycled-content versions.", days(2) + hours(4), attachments.find((a) => a.id === "att-pdf-2") ?? null),
  msg(1, "u5", "Material schedule uploaded so QS can reconcile quantities against the BOQ before tender.", days(2) + hours(6), attachments.find((a) => a.id === "att-xls-2") ?? null),
  msg(1, "u4", "Surcharge: the East core wall needs 12mm rebar instead of 10mm for the revised lateral load. Adding ~RM 22k.", days(1) + hours(2), null),
  msg(1, "u5", "Noted the rebar surcharge — I'll fold it into the contingency drawdown and re-issue the cost summary.", days(1) + hours(4), null),
  msg(1, "u2", "One more NRNC point: we can claim an extra 2 points if we install submetering for the tenant floors. Worth it for the Gold bid.", days(1) + hours(7), null),
  msg(1, "u1", "Yes to submetering — it pays back and helps the Gold case. Please include it in the electrical spec.", days(1) + hours(9), null),
  msg(1, "u8", "Submetering added to the electrical drawings. It affects the panel schedule slightly, re-drawing tonight.", hours(20), null),
  msg(1, "u6", "Great. Let's keep momentum — next stand-up tomorrow 9am, bring any outstanding open items.", hours(12), null),
  msg(1, "u3", "Final facade revision pushed to the project drive. The west elevation now uses the anti-glare glass per Aisyah's note.", hours(6), null),
  msg(1, "u1", "Thanks everyone. I'll review the submission pack tonight and confirm the freeze.", hours(3), null),
  msg(1, "u2", "Freeze confirmed from my side — all GBI sections are locked and uploaded.", hours(1) + mins(20), null),
  msg(1, "u3", "Thanks for the sign-off everyone. Site coordination notes will go in the weekly bulletin.", mins(35), null),

  // ── Project 2 · Green Meadows Residences ────────────────────────────
  msg(2, "u2", "Welcome to the Green Meadows thread. We're targeting Silver with a stretch goal of Gold on the shared facilities.", days(6), null),
  msg(2, "u12", "PM here. The construction phasing is set — Blocks A and B foundations start next week, C the week after.", days(5) + hours(4), null),
  msg(2, "u9", "I've mapped the IEQ credits. The main gap is ventilation rate testing — I'll draft the sampling plan.", days(4) + hours(2), null),
  msg(2, "u11", "Owner requirements updated with the landscape rainwater harvesting requirement. See the revised scope.", days(3) + hours(6), null),
  msg(2, "u10", "Material schedule uploaded for the finishes package. Recycled steel and low-VOC paints are captured.", days(2) + hours(5), null),
  msg(2, "u13", "Drafting the common lobby concept — warm timber panels with a lightwell to draw daylight into the corridors.", hours(9), null),
  msg(2, "u1", "Quick check from me — do the daylight simulations cover the corridor ends, or just the living rooms?", hours(4), null),
  msg(2, "u9", "Good question Aiman — I'll extend the simulation to the corridor ends and publish the results today.", hours(2), null),

  // ── Project 3 · Cedar Hills International School ────────────────────
  msg(3, "u6", "Cedar Hills kickoff. The school board wants the multi-purpose hall to reach GBI certification while staying on the tight construction window.", days(9), null),
  msg(3, "u16", "As facilitator I'll run a pre-assessment workshop with the teachers so their usage patterns inform the IEQ credits.", days(7), null),
  msg(3, "u14", "Structural design for the hall is complete — exposed steel trusses keep the column-free span for the stage area.", days(5) + hours(3), null),
  msg(3, "u15", "BOQ drafted for the hall. The acoustic ceiling and daylighting controls add roughly 6% to the budget.", days(4) + hours(1), null),
  msg(3, "u17", "Approval from the board is in — budget confirmed at the higher figure. We can proceed with the acoustic package.", days(2) + hours(6), null),
  msg(3, "u18", "HVAC sized for the hall: demand-controlled ventilation with CO2 sensors to keep energy down during assembly use.", hours(10), null),
  msg(3, "u16", "Perfect — that DOAS approach should secure the EA credit. I'll add the sensor layout to the checklist.", hours(3), null),
  msg(3, "u6", "Excellent progress. Next milestone is the mechanical approval drawing review on Friday.", mins(50), null),
];

// Seed a handful of reactions so the feature is visible immediately. Keys are
// emoji → array of reacting user ids. Guard against unknown ids so this stays
// safe even if the message list shifts. (Invoked below after the helpers are
// defined to avoid a temporal-dead-zone reference.)

const REACTION_PARTNERS: Record<string, string[]> = {
  "u1": ["u2", "u6", "u8"],
  "u2": ["u1", "u6", "u16"],
  "u6": ["u1", "u2", "u9"],
  "u8": ["u1", "u6"],
  "u9": ["u1", "u6"],
  "u16": ["u6", "u18"],
  u17: ["u6", "u16"],
  u18: ["u16", "u6"],
};

function reactSeed(messages: ProjectMessage[], messageId: string, reactions: Record<string, string[]>): void {
  const m = messages.find((x) => x.id === messageId);
  if (m) m.reactions = m.reactions ?? reactions;
}

function seedReactions(messages: ProjectMessage[]): void {
  // Collect every message we own so we can attach reactions via their ids.
  reactSeed(messages, "m-4", { "👍": ["u2", "u8"], "👀": ["u6"] });
  reactSeed(messages, "m-7", { "👀": ["u1", "u2"], "👍": ["u6"] });
  reactSeed(messages, "m-12", { "👍": ["u1", "u6"], "🎉": ["u2"] });
  reactSeed(messages, "m-18", { "❤️": ["u6"], "👍": ["u1"] });
  reactSeed(messages, "m-24", { "🎉": ["u1", "u2", "u6"], "👍": ["u8"] });
  reactSeed(messages, "m-29", { "👍": ["u1", "u2"] });
  reactSeed(messages, "m-33", { "👍": ["u6", "u16"], "👀": ["u17"] });
  reactSeed(messages, "m-38", { "🎉": ["u6", "u18"] });

  // Any message with an attached file gets a couple of default reactions, shown
  // as coming from project colleagues (never the sender).
  messages.forEach((m) => {
    if (!m.attachment || m.reactions) return;
    const reactor = seedReactionFor(m.senderId);
    m.reactions = reactor ? { "👍": [reactor], "👀": [reactor] } : {};
  });
}

function seedReactionFor(senderId: string): string | undefined {
  const partners = REACTION_PARTNERS[senderId] ?? [];
  return partners.find((id) => id !== senderId);
}

seedReactions(projectMessages);

export const getUser = (id: string): User | undefined => userById.get(id);

export function cloneUser(id: string): User | null {
  const u = userById.get(id);
  return u ? { ...u } : null;
}
