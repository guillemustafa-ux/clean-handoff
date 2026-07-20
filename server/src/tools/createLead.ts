import { nanoid } from "nanoid";
import { db } from "../db.js";
import type { Contact } from "../types.js";

interface LeadArgs {
  name?: string;
  phone?: string;
  email?: string;
  intent?: string;
  notes?: string;
}

export async function createLead(args: LeadArgs) {
  if (!args.name || !args.phone) {
    return { created: false, message: "Name and phone are required to create a lead." };
  }

  let contact = db.data.contacts.find((c) => c.phone === args.phone);
  if (contact) {
    contact.intent = args.intent ?? contact.intent;
    contact.notes = args.notes ?? contact.notes;
    if (args.email) contact.email = args.email;
  } else {
    contact = {
      id: `c_${nanoid(8)}`,
      name: args.name,
      phone: args.phone,
      email: args.email,
      existingPatient: false,
      intent: args.intent,
      notes: args.notes,
      createdAt: new Date().toISOString()
    } satisfies Contact;
    db.data.contacts.push(contact);
  }
  await db.write();

  return { created: true, contactId: contact.id };
}
