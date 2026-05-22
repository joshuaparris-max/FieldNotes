/**
 * FieldNotes — shared constants (schema v4)
 */
(function (global) {
  global.FieldNotesConstants = {
    SCHEMA_VERSION: 4,
    STORAGE_KEY_V2: "fieldnotes_incidents_v2",
    STORAGE_KEY_V1: "fieldnotes_notes_v1",
    UI_PREFS_KEY: "fieldnotes_ui_prefs_v1",

    CONTEXTS: [
      "Avance IT",
      "DCS",
      "Parris Tech Services",
      "Personal Lab",
      "Other",
    ],

    STATUSES: ["Open", "Resolved", "Escalated", "Waiting", "Learning Note"],

    PRIORITIES: ["Low", "Normal", "High", "Urgent"],

    PRIORITY_ORDER: { Urgent: 0, High: 1, Normal: 2, Low: 3 },

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

    SORT_OPTIONS: [
      { id: "updatedDesc", label: "Updated (newest)" },
      { id: "updatedAsc", label: "Updated (oldest)" },
      { id: "priority", label: "Priority" },
      { id: "status", label: "Status" },
      { id: "category", label: "Category" },
      { id: "context", label: "Context" },
      { id: "summaryAsc", label: "Summary A–Z" },
    ],
  };
})(window);
