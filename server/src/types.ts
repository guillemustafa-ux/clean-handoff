export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  existingPatient: boolean;
  insurance?: string;
  intent?: string;
  notes?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  contactId: string;
  date: string;
  time: string;
  reason: string;
  patientType: "new" | "existing";
  status: "confirmed" | "cancelled";
  createdAt: string;
}

export interface AvailabilitySlot {
  date: string;
  time: string;
  serviceType: string;
  booked: boolean;
}

export type EscalationReason =
  | "explicit_request"
  | "repeated_no_match"
  | "negative_sentiment"
  | "out_of_domain"
  | "emergency";

export interface Handoff {
  id: string;
  callId: string;
  timestamp: string;
  caller: {
    name: string | null;
    phone: string | null;
    existingPatient: boolean | null;
  };
  intent: "booking" | "qualification" | "emergency" | "other";
  escalationReason: EscalationReason;
  urgency: "normal" | "high" | "emergency";
  dataCollectedSoFar: {
    reasonForVisit: string | null;
    preferredDate: string | null;
    insurance: string | null;
  };
  attempts: {
    noMatchCount: number;
    questionsAsked: string[];
  };
  transcriptSummary: string;
  sentiment: "neutral" | "frustrated" | "positive";
}

export interface CallLog {
  id: string;
  callId: string;
  startedAt: string | null;
  endedAt: string | null;
  summary: string | null;
  outcome: string | null;
  escalated: boolean;
}

export interface DbData {
  contacts: Contact[];
  appointments: Appointment[];
  availability: AvailabilitySlot[];
  handoffs: Handoff[];
  callLogs: CallLog[];
}
