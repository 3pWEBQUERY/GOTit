import { getAuth } from "@app/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handler = (request: Request) => getAuth().handler(request);

export const { GET, POST } = toNextJsHandler(handler);
