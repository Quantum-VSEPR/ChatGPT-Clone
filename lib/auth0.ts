import { Auth0Client } from "@auth0/nextjs-auth0/server";

const appBaseUrl =
  process.env.APP_BASE_URL?.trim() ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

export const auth0 = new Auth0Client(appBaseUrl ? { appBaseUrl } : undefined);
