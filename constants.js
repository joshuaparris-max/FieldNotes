/**
 * FieldNotes — shared constants (schema v3)
 */
(function (global) {
  global.FieldNotesConstants = {
    SCHEMA_VERSION: 3,
    STORAGE_KEY_V2: "fieldnotes_incidents_v2",
    STORAGE_KEY_V1: "fieldnotes_notes_v1",

    CONTEXTS: [
      "Avance IT",
      "DCS",
      "Parris Tech Services",
      "Personal Lab",
      "Other",
    ],

    STATUSES: ["Open", "Resolved", "Escalated", "Waiting", "Learning Note"],

    PRIORITIES: ["Low", "Normal", "High", "Urgent"],

    CATEGORIES: [
      "Network",
      "Printer",
      "Account",
      "Microsoft 365",
      "Hardware",
      "Software",
      "Security",
      "Phone/3CX",
      "Datto/RMM",
      "Other",
    ],
  };
})(window);
