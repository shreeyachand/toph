import type { CurrentUser, DashboardStats, EmployeeLog } from "./types";

/**
 * Mock dataset shaped exactly like the Supabase rows to come.
 * Swap `getDashboardData` internals for Supabase queries later —
 * the page component won't need to change.
 */

export const mockUser: CurrentUser = {
  farm: "Bays Ranch",
  role: "Admin",
};

export const mockStats: DashboardStats = {
  todaysRecordings: 5,
  todaysNew: 1,
  activeWorkers: 12,
  responseAccuracy: 90,
};

export const mockLogs: EmployeeLog[] = [
  {
    id: "log-isaac-wang",
    employee: "Isaac Wang",
    activity: "Spraying",
    date: "April 19, 2026",
    isoDate: "2026-04-19",
    field: "FIELD A",
    time: "6:00 AM - 10:40 AM",
    isNew: true,
    summary:
      "Offline guided voice log created at 2026-04-08T22:01:01.711Z. Question (activity_type): What type of activity was this — spraying, fertilizing, planting, irrigating, harvesting, scouting, pruning, soil work, or equipment maintenance? Answer: I'm leaving first, I'm going to go home. Question (field_block): Where were you working (field, block, or area)? Answer: yes, in one part and then 130 and 200 yes, and 130 for uh 160 and no, this yes no, no, uhm no no I remember, uhm uhm uhm, no, I don't remember anything.",
  },
  {
    id: "log-maya-patel",
    employee: "Maya Patel",
    activity: "Harvesting",
    date: "April 20, 2026",
    isoDate: "2026-04-20",
    field: "FIELD B",
    time: "7:30 AM - 11:15 AM",
  },
  {
    id: "log-liam-johnson",
    employee: "Liam Johnson",
    activity: "Planting",
    date: "April 21, 2026",
    isoDate: "2026-04-21",
    field: "FIELD C",
    time: "8:00 AM - 12:00 PM",
  },
  {
    id: "log-sophia-lee",
    employee: "Sophia Lee",
    activity: "Irrigation",
    date: "April 22, 2026",
    isoDate: "2026-04-22",
    field: "FIELD D",
    time: "6:30 AM - 9:30 AM",
  },
  // Extra rows from the Figma expanded layout (below the fold)
  {
    id: "log-ethan-kim",
    employee: "Ethan Kim",
    activity: "Fertilizing",
    date: "April 23, 2026",
    isoDate: "2026-04-23",
    field: "FIELD E",
    time: "5:45 AM - 9:00 AM",
  },
  {
    id: "log-olivia-martinez",
    employee: "Olivia Martinez",
    activity: "Weeding",
    date: "April 24, 2026",
    isoDate: "2026-04-24",
    field: "FIELD F",
    time: "6:15 AM - 10:00 AM",
  },
  {
    id: "log-noah-brown",
    employee: "Noah Brown",
    activity: "Pruning",
    date: "April 25, 2026",
    isoDate: "2026-04-25",
    field: "FIELD G",
    time: "7:00 AM - 11:30 AM",
  },
  {
    id: "log-emma-davis",
    employee: "Emma Davis",
    activity: "Monitoring",
    date: "April 26, 2026",
    isoDate: "2026-04-26",
    field: "FIELD H",
    time: "8:15 AM - 12:45 PM",
  },
  {
    id: "log-james-wilson",
    employee: "James Wilson",
    activity: "Soil Testing",
    date: "April 27, 2026",
    isoDate: "2026-04-27",
    field: "FIELD I",
    time: "6:00 AM - 9:00 AM",
  },
  {
    id: "log-isabella-garcia",
    employee: "Isabella Garcia",
    activity: "Seeding",
    date: "April 28, 2026",
    isoDate: "2026-04-28",
    field: "FIELD J",
    time: "7:45 AM - 11:00 AM",
  },
  {
    id: "log-benjamin-moore",
    employee: "Benjamin Moore",
    activity: "Pest Control",
    date: "April 29, 2026",
    isoDate: "2026-04-29",
    field: "FIELD K",
    time: "6:30 AM - 10:30 AM",
  },
];
