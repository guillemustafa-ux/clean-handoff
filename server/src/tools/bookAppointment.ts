import { nanoid } from "nanoid";
import { db } from "../db.js";
import type { Appointment, Contact } from "../types.js";

interface BookArgs {
  name?: string;
  phone?: string;
  date?: string;
  time?: string;
  reason?: string;
  patientType?: "new" | "existing";
}

export async function bookAppointment(args: BookArgs) {
  const missing = ["name", "phone", "date", "time", "reason"].filter(
    (f) => !args[f as keyof BookArgs]
  );
  if (missing.length > 0) {
    return { booked: false, message: `Missing required fields: ${missing.join(", ")}.` };
  }

  const slot = db.data.availability.find(
    (s) => s.date === args.date && s.time === args.time && !s.booked
  );
  if (!slot) {
    return {
      booked: false,
      message: `The slot ${args.date} ${args.time} is not available. Offer another time.`
    };
  }

  let contact = db.data.contacts.find((c) => c.phone === args.phone);
  if (!contact) {
    contact = {
      id: `c_${nanoid(8)}`,
      name: args.name!,
      phone: args.phone!,
      existingPatient: args.patientType === "existing",
      createdAt: new Date().toISOString()
    } satisfies Contact;
    db.data.contacts.push(contact);
  }

  const appointment: Appointment = {
    id: `a_${nanoid(8)}`,
    contactId: contact.id,
    date: args.date!,
    time: args.time!,
    reason: args.reason!,
    patientType: args.patientType ?? "new",
    status: "confirmed",
    createdAt: new Date().toISOString()
  };
  slot.booked = true;
  db.data.appointments.push(appointment);
  await db.write();

  return {
    booked: true,
    appointmentId: appointment.id,
    confirmation: `Appointment confirmed for ${args.name} on ${args.date} at ${args.time}.`
  };
}
