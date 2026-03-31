import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean slate
  await prisma.tokenTransaction.deleteMany();
  await prisma.bet.deleteMany();
  await prisma.outcome.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  // Admin user
  const adminHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.create({
    data: {
      email: "admin@test.com",
      name: "Admin",
      passwordHash: adminHash,
      role: "ADMIN",
      tokenBalance: 500,
    },
  });

  // Sample users
  const aliceHash = await bcrypt.hash("alice123", 12);
  const alice = await prisma.user.create({
    data: {
      email: "alice@test.com",
      name: "Alice",
      passwordHash: aliceHash,
      role: "USER",
      tokenBalance: 45,
    },
  });

  const bobHash = await bcrypt.hash("bob123", 12);
  const bob = await prisma.user.create({
    data: {
      email: "bob@test.com",
      name: "Bob",
      passwordHash: bobHash,
      role: "USER",
      tokenBalance: 60,
    },
  });

  const charlieHash = await bcrypt.hash("charlie123", 12);
  const charlie = await prisma.user.create({
    data: {
      email: "charlie@test.com",
      name: "Charlie",
      passwordHash: charlieHash,
      role: "USER",
      tokenBalance: 30,
    },
  });

  // Grant token transactions for sample users
  await prisma.tokenTransaction.createMany({
    data: [
      { userId: alice.id, amount: 50, type: "GRANT", note: "Welcome bonus" },
      { userId: bob.id, amount: 60, type: "GRANT", note: "Welcome bonus" },
      { userId: charlie.id, amount: 30, type: "GRANT", note: "Welcome bonus" },
    ],
  });

  // ─── Event 1: Promotion ─────────────────────────────────────────────────────
  const event1 = await prisma.event.create({
    data: {
      title: "Will Alice get promoted before June?",
      description:
        "Alice has been crushing it at work and a promotion review is scheduled for Q2. Will she get that title bump before the end of June?",
      category: "Career",
      status: "OPEN",
      closesAt: new Date("2026-06-30T23:59:59Z"),
      createdById: admin.id,
      outcomes: {
        create: [
          { label: "Yes — promoted", baseProbability: 0.6 },
          { label: "No — not yet", baseProbability: 0.4 },
        ],
      },
    },
    include: { outcomes: true },
  });

  // ─── Event 2: Team dinner ────────────────────────────────────────────────────
  const event2 = await prisma.event.create({
    data: {
      title: "Where will the next group dinner be?",
      description:
        "The group is planning the next big dinner. Three contenders have been shortlisted. Where will we end up?",
      category: "Social",
      status: "OPEN",
      createdById: admin.id,
      outcomes: {
        create: [
          { label: "Italian", baseProbability: 0.4 },
          { label: "Japanese", baseProbability: 0.35 },
          { label: "Mexican", baseProbability: 0.25 },
        ],
      },
    },
    include: { outcomes: true },
  });

  // ─── Event 3: Mario Kart tournament ─────────────────────────────────────────
  const event3 = await prisma.event.create({
    data: {
      title: "Who wins the Mario Kart tournament?",
      description:
        "The annual group Mario Kart tournament is happening this weekend. Four racers enter, only one lifts the trophy. Bet wisely.",
      category: "Gaming",
      status: "OPEN",
      closesAt: new Date("2026-04-06T20:00:00Z"),
      createdById: admin.id,
      outcomes: {
        create: [
          { label: "Alex", baseProbability: 0.4 },
          { label: "Sam", baseProbability: 0.3 },
          { label: "Jordan", baseProbability: 0.2 },
          { label: "Taylor", baseProbability: 0.1 },
        ],
      },
    },
    include: { outcomes: true },
  });

  // ─── Sample bets ─────────────────────────────────────────────────────────────
  // Alice bets 5 tokens on "Yes" for event1
  const e1Yes = event1.outcomes.find((o) => o.label === "Yes — promoted")!;
  await prisma.bet.create({
    data: {
      userId: alice.id,
      eventId: event1.id,
      outcomeId: e1Yes.id,
      tokensStaked: 5,
      lockedOdds: 1.67,
      status: "ACTIVE",
    },
  });
  await prisma.outcome.update({
    where: { id: e1Yes.id },
    data: { totalStaked: { increment: 5 } },
  });
  await prisma.tokenTransaction.create({
    data: {
      userId: alice.id,
      amount: -5,
      type: "BET",
      note: "Bet on Yes — promoted",
    },
  });

  // Bob bets 10 tokens on "Italian" for event2
  const e2Italian = event2.outcomes.find((o) => o.label === "Italian")!;
  await prisma.bet.create({
    data: {
      userId: bob.id,
      eventId: event2.id,
      outcomeId: e2Italian.id,
      tokensStaked: 10,
      lockedOdds: 2.5,
      status: "ACTIVE",
    },
  });
  await prisma.outcome.update({
    where: { id: e2Italian.id },
    data: { totalStaked: { increment: 10 } },
  });
  await prisma.tokenTransaction.create({
    data: {
      userId: bob.id,
      amount: -10,
      type: "BET",
      note: "Bet on Italian",
    },
  });

  // Charlie bets 8 tokens on "Alex" for event3
  const e3Alex = event3.outcomes.find((o) => o.label === "Alex")!;
  await prisma.bet.create({
    data: {
      userId: charlie.id,
      eventId: event3.id,
      outcomeId: e3Alex.id,
      tokensStaked: 8,
      lockedOdds: 2.5,
      status: "ACTIVE",
    },
  });
  await prisma.outcome.update({
    where: { id: e3Alex.id },
    data: { totalStaked: { increment: 8 } },
  });
  await prisma.tokenTransaction.create({
    data: {
      userId: charlie.id,
      amount: -8,
      type: "BET",
      note: "Bet on Alex",
    },
  });

  console.log("✅ Seed complete!");
  console.log("");
  console.log("  Admin:   admin@test.com   / admin123");
  console.log("  Alice:   alice@test.com   / alice123");
  console.log("  Bob:     bob@test.com     / bob123");
  console.log("  Charlie: charlie@test.com / charlie123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
