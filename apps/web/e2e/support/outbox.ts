import { expect } from "@playwright/test";
import pg from "pg";

/** Liest die neueste E-Mail an eine Adresse aus dem Ausgang (nur Tests und Entwicklung). */
export async function latestMail(to: string, timeoutMs = 15_000): Promise<{ subject: string; text: string; link: string }> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    let row: { subject: string; text: string } | undefined;
    await expect(async () => {
      const result = await client.query<{ subject: string; text: string }>(
        'select subject, text from email_outbox where "to" = $1 order by "createdAt" desc limit 1',
        [to],
      );
      row = result.rows[0];
      expect(row, `E-Mail an ${to}`).toBeDefined();
    }).toPass({ timeout: timeoutMs });
    const link = row?.text.match(/https?:\/\/\S+/)?.[0];
    expect(link, "Link in der E-Mail").toBeTruthy();
    return { subject: row?.subject ?? "", text: row?.text ?? "", link: link ?? "" };
  } finally {
    await client.end();
  }
}

/** Zählt E-Mails an eine Adresse, zum Beispiel um zu prüfen, dass keine verschickt wurde. */
export async function mailCount(to: string): Promise<number> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query<{ count: string }>('select count(*) from email_outbox where "to" = $1', [to]);
    return Number(result.rows[0]?.count ?? 0);
  } finally {
    await client.end();
  }
}

/** Eindeutige, erkennbar fiktive Adresse für einen Test. */
export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@fiktiv.test`;
}

/** Wartet auf die neueste E-Mail mit diesem Betreff an eine Adresse und liefert ihren Link. */
export async function mailBySubject(to: string, subject: string, timeoutMs = 20_000): Promise<{ text: string; link: string }> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    let text = "";
    await expect(async () => {
      const result = await client.query<{ text: string }>('select text from email_outbox where "to" = $1 and subject = $2 order by "createdAt" desc limit 1', [to, subject]);
      expect(result.rows[0], `E-Mail «${subject}» an ${to}`).toBeDefined();
      text = result.rows[0]?.text ?? "";
    }).toPass({ timeout: timeoutMs });
    const link = text.match(/https?:\/\/\S+/)?.[0] ?? "";
    expect(link, "Link in der E-Mail").toBeTruthy();
    return { text, link };
  } finally {
    await client.end();
  }
}
