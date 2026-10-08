import { UserError } from "./doc";

export type Result<T = void> = ({ ok: true } & (T extends void ? object : { data: T })) | { ok: false; error: string };

/** Runs a server action body. Expected problems become a message for the person; anything else is logged and hidden. */
export async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await fn();
    return (data === undefined ? { ok: true } : { ok: true, data }) as Result<T>;
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: e.message };
    console.error("[action]", e);
    return { ok: false, error: "Something went wrong on our side. Try again in a moment." };
  }
}
