import type { Db } from "mongodb";

const RATE_LIMIT_COLLECTION = "user-rate-limits";
const DEFAULT_DAILY_LIMIT = 30;

type UserRateLimitDocument = {
  _id: string;
  userId: string;
  dayKey: string;
  count: number;
  createdAt: Date;
  updatedAt: Date;
  resetAt: Date;
  expiresAt: Date;
};

let indexInitialization: Promise<void> | null = null;

const getUtcDayKey = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getNextUtcDayStart = (date: Date) => {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)
  );
};

const ensureRateLimitIndexes = async (db: Db) => {
  if (!indexInitialization) {
    indexInitialization = (async () => {
      await db
        .collection<UserRateLimitDocument>(RATE_LIMIT_COLLECTION)
        .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      await db
        .collection<UserRateLimitDocument>(RATE_LIMIT_COLLECTION)
        .createIndex({ userId: 1, dayKey: 1 }, { unique: true });
    })();
  }

  await indexInitialization;
};

export const consumeDailyRequestLimit = async (
  db: Db,
  userId: string,
  dailyLimit = DEFAULT_DAILY_LIMIT
) => {
  const now = new Date();
  const dayKey = getUtcDayKey(now);
  const resetAt = getNextUtcDayStart(now);
  const documentId = `${userId}:${dayKey}`;

  await ensureRateLimitIndexes(db);

  const result = await db
    .collection<UserRateLimitDocument>(RATE_LIMIT_COLLECTION)
    .findOneAndUpdate(
    { _id: documentId },
    {
      $inc: { count: 1 },
      $set: {
        userId,
        dayKey,
        updatedAt: now,
        resetAt,
        expiresAt: resetAt,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  const currentCount = result?.count ?? 0;

  const allowed = currentCount <= dailyLimit;
  const remaining = Math.max(0, dailyLimit - currentCount);
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((resetAt.getTime() - now.getTime()) / 1000)
  );

  return {
    allowed,
    limit: dailyLimit,
    remaining,
    resetAt,
    retryAfterSeconds,
  };
};
