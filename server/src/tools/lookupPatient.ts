import { db } from "../db.js";

export async function lookupPatient(args: { phone?: string }) {
  const phone = (args.phone || "").replace(/[^\d+]/g, "");
  if (!phone) return { found: false, message: "No phone number provided." };

  const contact = db.data.contacts.find(
    (c) => c.phone.replace(/[^\d+]/g, "").endsWith(phone.replace(/^\+?1?/, ""))
  );
  if (!contact) {
    return { found: false, message: "No patient record found for that phone number." };
  }
  return {
    found: true,
    patient: {
      name: contact.name,
      existingPatient: contact.existingPatient,
      insurance: contact.insurance ?? "unknown"
    }
  };
}
