import "dotenv/config";

// Strip quotes: on Linux, dotenv reads values wrapped in double quotes literally
// (e.g. ADMIN_ID="123" becomes '"123"'), breaking string comparisons.
const clean = (v: string | undefined) => (v || "").replace(/"/g, "");

export const PORT = Number(clean(process.env.PORT)) || 3000;
export const VAPI_SERVER_SECRET = clean(process.env.VAPI_SERVER_SECRET);
