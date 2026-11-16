import { getAuth } from "@app/auth";
import { headers } from "next/headers";
import { cache } from "react";

/** Aktuelle Sitzung samt Konto, einmal pro Anfrage. */
export const getCurrentSession = cache(async () => getAuth().api.getSession({ headers: await headers() }));
