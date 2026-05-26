import { gifts, recipients } from "../product-data.js";
import { initialKinloopState } from "../persistence.js";

const fallbackPeopleBySlug = new Map(recipients.map((person) => [person.id, person]));
const fallbackGiftsByCatalogId = new Map(gifts.map((gift) => [gift.id, gift]));

export function getFallbackBirthdayData() {
  return {
    mode: "local",
    people: recipients,
    gifts
  };
}

export async function loadBirthdayData({ client } = {}) {
  if (!client) return getFallbackBirthdayData();

  const [peopleResult, giftsResult] = await Promise.all([
    client.from("people").select("*").order("birthday", { ascending: true }),
    client.from("gift_options").select("*").order("fit_score", { ascending: false })
  ]);

  if (peopleResult.error || giftsResult.error) {
    return {
      ...getFallbackBirthdayData(),
      mode: "local_resilience",
      fallbackReason: peopleResult.error?.message || giftsResult.error?.message
    };
  }

  if (!peopleResult.data.length || !giftsResult.data.length) {
    return {
      ...getFallbackBirthdayData(),
      mode: "local_resilience",
      fallbackReason: "No Supabase birthday rows available."
    };
  }

  return {
    mode: "supabase",
    people: peopleResult.data.map(mapSupabasePerson),
    gifts: giftsResult.data.map(mapSupabaseGift)
  };
}

export async function loadAccountState({ client } = {}) {
  if (!client) {
    return {
      mode: "local",
      auditEvents: initialKinloopState.auditEvents,
      reminderState: initialKinloopState.reminderState,
      approval: initialKinloopState.approval || null
    };
  }

  const [auditResult, remindersResult] = await Promise.all([
    client.from("audit_events").select("*").order("created_at", { ascending: false }).limit(20),
    client.from("reminders").select("*").order("updated_at", { ascending: false }).limit(1)
  ]);

  if (auditResult.error || remindersResult.error) {
    return {
      mode: "local",
      fallbackReason: auditResult.error?.message || remindersResult.error?.message,
      auditEvents: initialKinloopState.auditEvents,
      reminderState: initialKinloopState.reminderState,
      approval: initialKinloopState.approval || null
    };
  }

  const auditEvents = auditResult.data.map(mapSupabaseAuditEvent);
  const approvedEvent = auditResult.data.find((event) => event.event_type === "gift_approved");

  return {
    mode: "supabase",
    auditEvents: auditEvents.length ? auditEvents : initialKinloopState.auditEvents,
    reminderState: approvedEvent ? "approved" : remindersResult.data[0]?.state || initialKinloopState.reminderState,
    approval: approvedEvent?.metadata || initialKinloopState.approval || null
  };
}

export async function recordKinloopImport({ client, people = [], sourceImport = null } = {}) {
  const userId = await resolveUserId(client);

  if (!client || !userId || !people.length) {
    return {
      mode: "local",
      recorded: false
    };
  }

  const peopleResult = await client
    .from("people")
    .upsert(people.map((person) => mapPersonForPersistence({ person, userId })), { onConflict: "user_id,slug" })
    .select("id, slug");

  if (peopleResult.error) {
    return {
      mode: "local",
      recorded: false,
      fallbackReason: peopleResult.error.message
    };
  }

  const auditResult = await client.from("audit_events").insert({
    user_id: userId,
    actor: "user",
    event_type: "synthetic_source_imported",
    entity_type: "kinloop_workflow",
    summary: `${people.length} synthetic people imported into Kinloop.`,
    metadata: {
      source: "synthetic-source-sample.json",
      mode: sourceImport?.mode || "local_source",
      people: people.map((person) => ({
        id: person.id,
        name: person.name,
        clues: person.clues || person.likes || [],
        source_count: person.sourceCount || 0
      }))
    }
  });

  if (auditResult.error) {
    return {
      mode: "local",
      recorded: false,
      fallbackReason: auditResult.error.message
    };
  }

  return {
    mode: "supabase",
    recorded: true,
    people: peopleResult.data || []
  };
}

export async function recordKinloopAuditEvent({ client, eventType, summary, metadata = {} } = {}) {
  const userId = await resolveUserId(client);

  if (!client || !userId || !eventType || !summary) {
    return {
      mode: "local",
      recorded: false
    };
  }

  const result = await client.from("audit_events").insert({
    user_id: userId,
    actor: "user",
    event_type: eventType,
    entity_type: "kinloop_workflow",
    summary,
    metadata
  });

  if (result.error) {
    return {
      mode: "local",
      recorded: false,
      fallbackReason: result.error.message
    };
  }

  return {
    mode: "supabase",
    recorded: true
  };
}

export async function recordKinloopApproval({ client, option, person = null, reminderDays = 0 } = {}) {
  const userId = await resolveUserId(client);

  if (!client || !userId || !option) {
    return {
      mode: "local",
      approvedGiftId: option?.id || null
    };
  }

  const giftResult = await client
    .from("gift_options")
    .select("id, brief_id")
    .eq("catalog_id", option.id)
    .limit(1)
    .maybeSingle();

  if (giftResult.error || !giftResult.data) {
    return recordKinloopAuditEvent({
      client,
      eventType: "gift_approved",
      summary: `${option.title} approved for ${person?.name || "recipient"}.`,
      metadata: {
        gift_id: option.id,
        title: option.title,
        fit_score: option.fitScore,
        person_id: person?.id || null,
        person_name: person?.name || null,
        reminder_days: reminderDays
      }
    });
  }

  const approvalResult = await client.from("approvals").insert({
    user_id: userId,
    brief_id: giftResult.data.brief_id,
    gift_option_id: giftResult.data.id,
    status: "approved",
    channel: "web"
  });
  const personResult = person?.id
    ? await client.from("people").select("id").eq("slug", person.id).limit(1).maybeSingle()
    : { data: null, error: null };
  const reminderResult = reminderDays > 0 && personResult.data?.id
    ? await client.from("reminders").insert({
        user_id: userId,
        person_id: personResult.data.id,
        state: "approved",
        due_at: reminderDueAt({ birthday: person?.birthday, reminderDays }),
        channel: "web"
      })
    : { error: null };

  const auditResult = await client.from("audit_events").insert({
    user_id: userId,
    actor: "user",
    event_type: "gift_approved",
    entity_type: "gift_option",
    entity_id: giftResult.data.id,
    summary: `${option.title} approved for ${person?.name || "recipient"}.`,
    metadata: {
      gift_id: option.id,
      title: option.title,
      fit_score: option.fitScore,
      person_id: person?.id || null,
      person_name: person?.name || null,
      reminder_days: reminderDays
    }
  });

  if (approvalResult.error || reminderResult.error || auditResult.error) {
    return {
      mode: "local",
      approvedGiftId: option.id,
      fallbackReason: approvalResult.error?.message || reminderResult.error?.message || auditResult.error?.message
    };
  }

  return {
    mode: "supabase",
    approvedGiftId: option.id
  };
}

async function resolveUserId(client) {
  if (!client) return null;
  const userResult = await client.auth.getUser();
  return userResult.data?.user?.id || null;
}

function mapSupabasePerson(row) {
  const fallback = fallbackPeopleBySlug.get(row.slug) || recipients[0];
  return {
    ...fallback,
    supabaseId: row.id,
    id: row.slug,
    name: row.name,
    relation: row.relation,
    birthday: formatBirthday(row.birthday, fallback.birthday),
    budget: formatBudget(row.budget_min, row.budget_max, fallback.budget),
    likes: row.likes || fallback.likes,
    avoid: row.avoid || fallback.avoid,
    note: row.notes || fallback.note,
    addressStatus: titleCase(row.address_status || fallback.addressStatus)
  };
}

function mapPersonForPersistence({ person, userId }) {
  const budget = parseBudget(person.budget);
  return {
    user_id: userId,
    slug: person.id,
    name: person.name,
    relation: person.relation,
    birthday: parseBirthday(person.birthday),
    budget_min: budget.min,
    budget_max: budget.max,
    address_status: String(person.addressStatus || "unknown").toLowerCase().replace(/\s+/g, "_"),
    notes: person.note,
    likes: person.clues || person.likes || [],
    avoid: person.avoid || []
  };
}

function mapSupabaseGift(row) {
  const fallback = fallbackGiftsByCatalogId.get(row.catalog_id) || gifts[0];
  return {
    ...fallback,
    supabaseId: row.id,
    briefId: row.brief_id,
    id: row.catalog_id,
    name: row.name,
    seller: row.seller,
    price: row.price_cents / 100,
    displayPrice: `${row.currency || "GBP"} ${(row.price_cents / 100).toFixed(2)}`,
    delivery: row.delivery_label,
    score: row.fit_score,
    consider: row.risk_note || fallback.consider
  };
}

function mapSupabaseAuditEvent(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    title: titleCase(row.event_type || "account_updated"),
    summary: row.summary || "Account activity was recorded.",
    mode: "supabase"
  };
}

function formatBirthday(value, fallback) {
  if (!value) return fallback;
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}

function formatBudget(min, max, fallback) {
  if (!min || !max) return fallback;
  return `GBP ${min}-${max}`;
}

function parseBirthday(value) {
  const date = new Date(`${value}, 2026 12:00:00 UTC`);
  if (Number.isNaN(date.getTime())) return "2026-12-31";
  return date.toISOString().slice(0, 10);
}

function parseBudget(value = "") {
  const [min, max] = String(value).match(/\d+/g)?.map(Number) || [];
  return {
    min: Number.isFinite(min) ? min : null,
    max: Number.isFinite(max) ? max : Number.isFinite(min) ? min : null
  };
}

function reminderDueAt({ birthday, reminderDays }) {
  const date = new Date(`${birthday}, 2026 09:00:00 UTC`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() - Number(reminderDays || 0));
  return date.toISOString();
}

function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
