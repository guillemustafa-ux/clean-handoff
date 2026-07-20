import { Router } from "express";
import { nanoid } from "nanoid";
import { db } from "../db.js";
import type { Appointment, Contact } from "../types.js";

export const crm = Router();

crm.get("/contacts", (_req, res) => {
  res.json(db.data.contacts);
});

crm.post("/contacts", async (req, res) => {
  const { name, phone, email, existingPatient, insurance } = req.body ?? {};
  if (!name || !phone) {
    res.status(400).json({ error: "name and phone are required" });
    return;
  }
  const contact: Contact = {
    id: `c_${nanoid(8)}`,
    name,
    phone,
    email,
    existingPatient: Boolean(existingPatient),
    insurance,
    createdAt: new Date().toISOString()
  };
  db.data.contacts.push(contact);
  await db.write();
  res.status(201).json(contact);
});

crm.get("/appointments", (_req, res) => {
  res.json(db.data.appointments);
});

crm.post("/appointments", async (req, res) => {
  const { contactId, date, time, reason, patientType } = req.body ?? {};
  if (!contactId || !date || !time || !reason) {
    res.status(400).json({ error: "contactId, date, time and reason are required" });
    return;
  }
  const appointment: Appointment = {
    id: `a_${nanoid(8)}`,
    contactId,
    date,
    time,
    reason,
    patientType: patientType === "existing" ? "existing" : "new",
    status: "confirmed",
    createdAt: new Date().toISOString()
  };
  db.data.appointments.push(appointment);
  await db.write();
  res.status(201).json(appointment);
});

crm.get("/availability", (_req, res) => {
  res.json(db.data.availability.filter((s) => !s.booked));
});
