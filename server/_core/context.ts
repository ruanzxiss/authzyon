import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { parse as parseCookieHeader } from "cookie";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Parse cookies manually so custom auth procedures can read them
  if (!opts.req.cookies) {
    const cookieHeader = opts.req.headers.cookie;
    (opts.req as any).cookies = cookieHeader ? parseCookieHeader(cookieHeader) : {};
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
