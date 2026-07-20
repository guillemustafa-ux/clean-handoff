import { db } from "../db.js";

export async function checkAvailability(args: { date?: string; serviceType?: string }) {
  let open = db.data.availability.filter((s) => !s.booked);
  if (args.date) open = open.filter((s) => s.date === args.date);

  if (open.length === 0) {
    return {
      available: false,
      message: args.date
        ? `No open slots on ${args.date}. Ask the caller for another day.`
        : "No open slots in the next few days."
    };
  }
  return {
    available: true,
    slots: open.slice(0, 6).map((s) => ({ date: s.date, time: s.time }))
  };
}
