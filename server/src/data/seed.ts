import type { DbData } from "../types.js";

function nextDays(count: number): string[] {
  const days: string[] = [];
  const d = new Date();
  while (days.length < count) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function seedData(): DbData {
  const days = nextDays(5);
  const times = ["09:00", "10:30", "14:00", "15:30", "17:00"];

  return {
    contacts: [
      {
        id: "c_seed_1",
        name: "Maria Lopez",
        phone: "+15550001111",
        email: "maria.lopez@example.com",
        existingPatient: true,
        insurance: "DeltaCare",
        createdAt: "2026-01-10T14:00:00.000Z"
      },
      {
        id: "c_seed_2",
        name: "James Carter",
        phone: "+15550002222",
        existingPatient: true,
        insurance: "None",
        createdAt: "2026-03-22T09:30:00.000Z"
      }
    ],
    appointments: [],
    availability: days.flatMap((date) =>
      times.map((time) => ({
        date,
        time,
        serviceType: "general",
        booked: false
      }))
    ),
    handoffs: [],
    callLogs: []
  };
}
