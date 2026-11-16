import { getFormatter } from "next-intl/server";
import { getOwnPasskeys } from "../queries/get-own-passkeys";
import { PasskeyList } from "./passkey-list";

/** Lädt die eigenen Passkeys und gibt sie ohne Schlüsselmaterial an die Liste. */
export async function PasskeysSection({ userId }: { userId: string }) {
  const [format, passkeys] = await Promise.all([getFormatter(), getOwnPasskeys(userId)]);
  const rows = passkeys.map((passkey) => ({
    id: passkey.id,
    name: passkey.name,
    backedUp: passkey.backedUp,
    created: passkey.createdAt ? format.dateTime(passkey.createdAt, { day: "2-digit", month: "2-digit", year: "numeric" }) : null,
  }));
  return <PasskeyList passkeys={rows} />;
}
