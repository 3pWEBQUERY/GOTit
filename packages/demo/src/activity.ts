import { addDays, zonedDay, zonedToUtc } from "@app/core/booking";
import type { BookingStatus, ParticipantRole, PrismaClient } from "@app/db";
import { upsertAccount } from "./accounts";
import { demoConversations, demoFavorites, demoMembers, demoOpenRequests, demoReviews, type DemoMessage } from "./data/activity";
import type { DemoProvider } from "./data/providers";
import { conversationId, memberEmail, memberUserId, profileId, providerUserId } from "./ids";
import { windowsOf } from "./profiles";

/**
 * Aktivität der Demo-Mitglieder (Entscheid 0023): Unterhaltungen, Termine,
 * Bewertungen und Favoriten. Bewertungen brauchen einen stattgefundenen Termin
 * des Autors (Trigger `check_review_qualifies`), deshalb entstehen zuerst die
 * Terminanfragen im Status COMPLETED. Zeiten liegen relativ zu «jetzt»; ein
 * zweiter Lauf schiebt offene Anfragen wieder in die Zukunft.
 */
const TZ = "Europe/Zurich";
const MINUTE = 60_000;

export async function seedMembers(db: PrismaClient, now: Date): Promise<string[]> {
  for (const member of demoMembers) {
    await upsertAccount(db, { id: memberUserId(member.key), email: memberEmail(member.key), name: member.name, accountType: "MEMBER" }, now);
  }
  return demoMembers.map((member) => memberUserId(member.key));
}

async function ensureConversation(db: PrismaClient, provider: string, member: string, createdAt: Date): Promise<string> {
  const id = conversationId(provider, member);
  const memberId = memberUserId(member);
  await db.conversation.upsert({
    where: { id },
    create: { id, providerProfileId: profileId(provider), memberUserId: memberId, createdAt, lastMessageAt: createdAt },
    update: {},
  });
  for (const [userId, role] of [
    [memberId, "MEMBER"],
    [providerUserId(provider), "PROVIDER"],
  ] as const) {
    await db.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId: id, userId } },
      create: { conversationId: id, userId, role },
      update: { archivedAt: null },
    });
  }
  return id;
}

async function writeMessages(db: PrismaClient, conversation: string, provider: string, member: string, messages: readonly DemoMessage[], now: Date): Promise<void> {
  const prefix = `${conversation}_msg_`;
  await db.message.deleteMany({ where: { conversationId: conversation, id: { startsWith: prefix, notIn: messages.map((_, index) => `${prefix}${index}`) } } });
  let lastAt: Date | null = null;
  let lastProviderAt: Date | null = null;
  for (const [index, message] of messages.entries()) {
    const id = `${prefix}${index}`;
    const createdAt = new Date(now.getTime() - message.minutesAgo * MINUTE);
    const senderId = message.from === "member" ? memberUserId(member) : providerUserId(provider);
    await db.message.upsert({
      where: { id },
      create: { id, conversationId: conversation, senderId, body: message.text, clientId: `demo-${id}`, createdAt },
      update: { body: message.text, createdAt, deletedAt: null, hiddenAt: null, hiddenById: null },
    });
    if (!lastAt || createdAt > lastAt) lastAt = createdAt;
    if (message.from === "provider" && (!lastProviderAt || createdAt > lastProviderAt)) lastProviderAt = createdAt;
  }
  if (!lastAt) return;
  await db.conversation.update({ where: { id: conversation }, data: { lastMessageAt: lastAt } });
  // Das Mitglied hat alles gelesen; beim Anbieter bleibt die letzte Nachricht des Mitglieds ungelesen.
  await db.conversationParticipant.update({ where: { conversationId_userId: { conversationId: conversation, userId: memberUserId(member) } }, data: { lastReadAt: lastAt } });
  await db.conversationParticipant.update({ where: { conversationId_userId: { conversationId: conversation, userId: providerUserId(provider) } }, data: { lastReadAt: lastProviderAt } });
}

interface BookingStep {
  actorRole: ParticipantRole | null;
  action: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
}

const STEPS: Record<"REQUESTED" | "NEGOTIATING" | "CONFIRMED" | "COMPLETED", BookingStep[]> = {
  REQUESTED: [{ actorRole: "MEMBER", action: "created", fromStatus: null, toStatus: "REQUESTED" }],
  NEGOTIATING: [
    { actorRole: "MEMBER", action: "created", fromStatus: null, toStatus: "REQUESTED" },
    { actorRole: "PROVIDER", action: "counter", fromStatus: "REQUESTED", toStatus: "NEGOTIATING" },
  ],
  CONFIRMED: [
    { actorRole: "MEMBER", action: "created", fromStatus: null, toStatus: "REQUESTED" },
    { actorRole: "PROVIDER", action: "accept", fromStatus: "REQUESTED", toStatus: "CONFIRMED" },
  ],
  COMPLETED: [
    { actorRole: "MEMBER", action: "created", fromStatus: null, toStatus: "REQUESTED" },
    { actorRole: "PROVIDER", action: "accept", fromStatus: "REQUESTED", toStatus: "CONFIRMED" },
    { actorRole: "PROVIDER", action: "complete", fromStatus: "CONFIRMED", toStatus: "COMPLETED" },
  ],
};

interface BookingInput {
  id: string;
  conversation: string;
  provider: string;
  member: string;
  status: keyof typeof STEPS;
  startsAt: Date;
  endsAt: Date;
  createdAt: Date;
  expiresAt: Date;
  message: string;
}

async function writeBooking(db: PrismaClient, input: BookingInput): Promise<void> {
  const lastProposedBy: ParticipantRole = input.status === "NEGOTIATING" ? "PROVIDER" : "MEMBER";
  const data = { status: input.status, startsAt: input.startsAt, endsAt: input.endsAt, lastProposedBy, message: input.message, expiresAt: input.expiresAt, reminderSentAt: null };
  await db.bookingRequest.upsert({
    where: { id: input.id },
    create: { id: input.id, conversationId: input.conversation, providerProfileId: profileId(input.provider), memberUserId: memberUserId(input.member), createdAt: input.createdAt, ...data },
    update: data,
  });
  await db.bookingEvent.deleteMany({ where: { requestId: input.id } });
  await db.bookingEvent.createMany({
    data: STEPS[input.status].map((step, index) => ({
      id: `${input.id}_event_${index}`,
      requestId: input.id,
      ...step,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      createdAt: new Date(input.createdAt.getTime() + index * 30 * MINUTE),
    })),
  });
}

/** Nächster Beginn in einem Wochenfenster des Profils, frühestens `inDays` Tage ab heute. */
function nextSlot(provider: DemoProvider | undefined, now: Date, inDays: number, offsetMinutes: number): Date {
  const windows = provider ? windowsOf(provider.availability) : [];
  const today = zonedDay(now, TZ).day;
  for (let offset = inDays; offset < inDays + 14; offset += 1) {
    const day = addDays(today, offset);
    const weekday = zonedDay(zonedToUtc(day, 12 * 60, TZ), TZ).weekday;
    const window = windows.find(([entry]) => entry === weekday);
    if (window) return zonedToUtc(day, Math.min(window[1] + offsetMinutes, window[2] - 120), TZ);
  }
  return zonedToUtc(addDays(today, inDays), 19 * 60, TZ);
}

export async function seedActivity(db: PrismaClient, providers: readonly DemoProvider[], now: Date): Promise<{ reviews: number; openRequests: number; conversations: number }> {
  const byKey = new Map(providers.map((provider) => [provider.key, provider]));
  const today = zonedDay(now, TZ).day;
  const conversations = new Set<string>();

  for (const review of demoReviews) {
    const startsAt = zonedToUtc(addDays(today, -review.daysAgo), 19 * 60, TZ);
    const endsAt = new Date(startsAt.getTime() + 60 * MINUTE);
    const requestedAt = new Date(startsAt.getTime() - 3 * 24 * 60 * MINUTE);
    const conversation = await ensureConversation(db, review.provider, review.member, requestedAt);
    conversations.add(conversation);
    const bookingId = `demo_booking_${review.provider}_${review.member}_done`;
    await writeBooking(db, { id: bookingId, conversation, provider: review.provider, member: review.member, status: "COMPLETED", startsAt, endsAt, createdAt: requestedAt, expiresAt: startsAt, message: "Ich freue mich auf das Treffen." });
    const [communication, accuracy, organization, overall] = review.ratings;
    const publishedAt = new Date(endsAt.getTime() + 2 * 24 * 60 * MINUTE);
    const content = { communication, accuracy, organization, overall, text: review.text, status: "PUBLISHED" as const, publishedAt, response: review.response ?? null, respondedAt: review.response ? new Date(publishedAt.getTime() + 24 * 60 * MINUTE) : null };
    const id = `demo_review_${review.provider}_${review.member}`;
    await db.review.upsert({
      where: { id },
      create: { id, bookingRequestId: bookingId, providerProfileId: profileId(review.provider), authorUserId: memberUserId(review.member), createdAt: new Date(endsAt.getTime() + 24 * 60 * MINUTE), ...content },
      update: content,
    });
  }

  for (const entry of demoConversations) {
    const oldest = Math.max(...entry.messages.map((message) => message.minutesAgo));
    const conversation = await ensureConversation(db, entry.provider, entry.member, new Date(now.getTime() - (oldest + 5) * MINUTE));
    conversations.add(conversation);
    await writeMessages(db, conversation, entry.provider, entry.member, entry.messages, now);
  }

  for (const [index, request] of demoOpenRequests.entries()) {
    const conversation = await ensureConversation(db, request.provider, request.member, new Date(now.getTime() - 3 * 60 * MINUTE));
    conversations.add(conversation);
    const startsAt = nextSlot(byKey.get(request.provider), now, request.inDays, (index % 3) * 90);
    const createdAt = new Date(now.getTime() - (index + 1) * 50 * MINUTE);
    const expiresAt = new Date(Math.min(createdAt.getTime() + 48 * 60 * MINUTE, startsAt.getTime()));
    await writeBooking(db, {
      id: `demo_booking_${request.provider}_${request.member}_open`,
      conversation,
      provider: request.provider,
      member: request.member,
      status: request.status,
      startsAt,
      endsAt: new Date(startsAt.getTime() + request.durationMinutes * MINUTE),
      createdAt,
      expiresAt,
      message: request.message,
    });
  }

  await seedFavorites(db, now);
  return { reviews: demoReviews.length, openRequests: demoOpenRequests.length, conversations: conversations.size };
}

/** Sammlung des Mitglieds: die Standardsammlung «Favoriten» (leerer Name) und eigene, gefunden über Name wie in der App. */
async function collection(db: PrismaClient, userId: string, name: string, isDefault: boolean, sortOrder: number): Promise<string> {
  const existing = await db.collection.findFirst({ where: isDefault ? { userId, isDefault: true } : { userId, name }, select: { id: true } });
  if (existing) return existing.id;
  const created = await db.collection.create({ data: { id: `${userId}_col_${sortOrder}`, userId, name, isDefault, sortOrder }, select: { id: true } });
  return created.id;
}

async function seedFavorites(db: PrismaClient, now: Date): Promise<void> {
  const userId = memberUserId("mitglied");
  const lists = [{ name: "", isDefault: true, providers: demoFavorites.default }, ...demoFavorites.collections.map((entry) => ({ name: entry.name, isDefault: false, providers: entry.providers }))];
  for (const [sortOrder, list] of lists.entries()) {
    const collectionId = await collection(db, userId, list.name, list.isDefault, sortOrder);
    await db.favorite.deleteMany({ where: { collectionId } });
    await db.favorite.createMany({
      data: list.providers.map((key, position) => ({ id: `${collectionId}_fav_${key}`, collectionId, providerProfileId: profileId(key), sortOrder: position, createdAt: new Date(now.getTime() - (position + 1) * 24 * 60 * MINUTE) })),
    });
  }
}
