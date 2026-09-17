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
    status: "new",
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
    status: "reviewed",
    summary:
      "Offline guided voice log created at 2026-04-20T11:18:42.093Z. Question (activity_type): What type of activity was this — spraying, fertilizing, planting, irrigating, harvesting, scouting, pruning, soil work, or equipment maintenance? Answer: harvesting, yes, harvesting tomatoes, uhm, the cherry ones in FIELD B. Question (field_block): Where were you working (field, block, or area)? Answer: FIELD B, north end, rows uh 12 through 28, yeah 12 to 28. Question (duration_crew): How long did it take and who was with you? Answer: started around seven thirty, finished eleven fifteen, me plus three others, uhm, Priya and, and two seasonal guys. Question (yield_notes): How much did you pick, anything to flag? Answer: about, uh, forty two lugs, some split fruit on row 20, no, nothing major, just, just hot by the end.",
  },
  {
    id: "log-liam-johnson",
    employee: "Liam Johnson",
    activity: "Planting",
    date: "April 21, 2026",
    isoDate: "2026-04-21",
    field: "FIELD C",
    time: "8:00 AM - 12:00 PM",
    status: "reviewed",
    summary:
      "Offline guided voice log created at 2026-04-21T12:04:11.455Z. Question (activity_type): What type of activity was this — spraying, fertilizing, planting, irrigating, harvesting, scouting, pruning, soil work, or equipment maintenance? Answer: planting, yeah, transplanting peppers, bell peppers. Question (field_block): Where were you working (field, block, or area)? Answer: FIELD C, west side, uh beds 8, 9, 10, and part of 11. Question (duration_crew): How long did it take and who was with you? Answer: eight to twelve, four hours, me and Carlos, and, uhm, one more in the morning. Question (details): What did you plant, spacing, water? Answer: uh, about 900 starts, eighteen inch spacing, drip on after, yes, watered in, soil was, was good, moist, no dry spots. Question (issues): Anything broken or needing follow-up? Answer: one clogged emitter on bed 9, no, fixed it, fixed it already.",
  },
  {
    id: "log-sophia-lee",
    employee: "Sophia Lee",
    activity: "Irrigation",
    date: "April 22, 2026",
    isoDate: "2026-04-22",
    field: "FIELD D",
    time: "6:30 AM - 9:30 AM",
    status: "reviewed",
    summary:
      "Offline guided voice log created at 2026-04-22T09:34:27.802Z. Question (activity_type): What type of activity was this — spraying, fertilizing, planting, irrigating, harvesting, scouting, pruning, soil work, or equipment maintenance? Answer: irrigating, uh irrigation check and run. Question (field_block): Where were you working (field, block, or area)? Answer: FIELD D, whole block, zones 1 through 6, yes, all six. Question (duration_crew): How long did it take and who was with you? Answer: six thirty to nine thirty, just me, solo. Question (details): How long did each zone run, any pressure issues? Answer: uh, forty five minutes each, pressure good, around 28 psi, zone 4 was, was low at first, uh air in the line, then fine. Question (issues): Leaks or repairs needed? Answer: small leak at the riser near, uh, zone 3 valve, taped it, needs a, needs a proper fitting tomorrow.",
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
    status: "reviewed",
    summary:
      "Offline guided voice log created at 2026-04-23T09:07:55.310Z. Question (activity_type): What type of activity was this — spraying, fertilizing, planting, irrigating, harvesting, scouting, pruning, soil work, or equipment maintenance? Answer: fertilizing, side-dress, uh nitrogen on the corn. Question (field_block): Where were you working (field, block, or area)? Answer: FIELD E, east half, rows, uh, 40 to 75, yes. Question (duration_crew): How long did it take and who was with you? Answer: five forty five to nine, me and Jorge, tractor and, and hand spreader on the ends. Question (details): What product and rate did you apply? Answer: urea, uh, about 120 pounds per acre, washed in with, with the drip after, wind was calm, good. Question (issues): Anything to flag? Answer: hopper jammed once near row 60, no, cleared it, no spill, no spill really.",
  },
  {
    id: "log-olivia-martinez",
    employee: "Olivia Martinez",
    activity: "Weeding",
    date: "April 24, 2026",
    isoDate: "2026-04-24",
    field: "FIELD F",
    time: "6:15 AM - 10:00 AM",
    status: "reviewed",
    summary:
      "Offline guided voice log created at 2026-04-24T10:05:19.677Z. Question (activity_type): What type of activity was this — spraying, fertilizing, planting, irrigating, harvesting, scouting, pruning, soil work, or equipment maintenance? Answer: weeding, hand weeding, uh carrots and beets. Question (field_block): Where were you working (field, block, or area)? Answer: FIELD F, beds 4 through 12, yes, 4 to 12. Question (duration_crew): How long did it take and who was with you? Answer: six fifteen to ten, crew of five, me plus four. Question (details): How far did you get, weed pressure? Answer: finished all nine beds, pigweed was, was bad on 7 and 8, uh pulled, pulled everything, thinned carrots too. Question (issues): Anything left or damaged? Answer: bed 11 still has, uhm, some grasses, needs a second pass, no crop damage, no.",
  },
  {
    id: "log-noah-brown",
    employee: "Noah Brown",
    activity: "Pruning",
    date: "April 25, 2026",
    isoDate: "2026-04-25",
    field: "FIELD G",
    time: "7:00 AM - 11:30 AM",
    status: "reviewed",
    summary:
      "Offline guided voice log created at 2026-04-25T11:36:02.148Z. Question (activity_type): What type of activity was this — spraying, fertilizing, planting, irrigating, harvesting, scouting, pruning, soil work, or equipment maintenance? Answer: pruning, uh, stone fruit thinning and pruning. Question (field_block): Where were you working (field, block, or area)? Answer: FIELD G orchard, rows 5 to 14, yes, the, the peach block. Question (duration_crew): How long did it take and who was with you? Answer: seven to eleven thirty, me plus two, uh Sam and Luis. Question (details): What did you cut, how much? Answer: suckers and crossing limbs, thinned fruit to, uh, six inches apart, brush piled at the end of, of row 10. Question (issues): Disease or tools? Answer: some, some brown rot on row 12, flagged it, loppers need, uhm, sharpening, yes.",
  },
  {
    id: "log-emma-davis",
    employee: "Emma Davis",
    activity: "Monitoring",
    date: "April 26, 2026",
    isoDate: "2026-04-26",
    field: "FIELD H",
    time: "8:15 AM - 12:45 PM",
    status: "reviewed",
    summary:
      "Offline guided voice log created at 2026-04-26T12:51:44.920Z. Question (activity_type): What type of activity was this — spraying, fertilizing, planting, irrigating, harvesting, scouting, pruning, soil work, or equipment maintenance? Answer: scouting, monitoring, pest check, yes. Question (field_block): Where were you working (field, block, or area)? Answer: FIELD H, whole field, walked, uh, every third row, traps 1 through 8. Question (duration_crew): How long did it take and who was with you? Answer: eight fifteen to twelve forty five, solo, just me. Question (details): What did you find, counts? Answer: aphids on the, the north edge, trap 3 had, uh, twelve moths, twelve, rest low, sticky cards changed. Question (issues): Spray needed? Answer: no spray yet, recheck in, in three days, photos, photos taken, yes.",
  },
  {
    id: "log-james-wilson",
    employee: "James Wilson",
    activity: "Soil Testing",
    date: "April 27, 2026",
    isoDate: "2026-04-27",
    field: "FIELD I",
    time: "6:00 AM - 9:00 AM",
    status: "reviewed",
    summary:
      "Offline guided voice log created at 2026-04-27T09:12:33.561Z. Question (activity_type): What type of activity was this — spraying, fertilizing, planting, irrigating, harvesting, scouting, pruning, soil work, or equipment maintenance? Answer: soil work, soil sampling, yes. Question (field_block): Where were you working (field, block, or area)? Answer: FIELD I, grid points, uh A1 through C4, twelve cores. Question (duration_crew): How long did it take and who was with you? Answer: six to nine, me and, and one intern, uh, what's his name, Tyler. Question (details): Depth, conditions, lab? Answer: six inch cores, soil moist from, from yesterday's run, bagged and labeled, going to, to the lab today. Question (issues): Anything odd? Answer: compacted layer on the, the south end, probe, probe bent a little, no, no other issues.",
  },
  {
    id: "log-isabella-garcia",
    employee: "Isabella Garcia",
    activity: "Seeding",
    date: "April 28, 2026",
    isoDate: "2026-04-28",
    field: "FIELD J",
    time: "7:45 AM - 11:00 AM",
    status: "reviewed",
    summary:
      "Offline guided voice log created at 2026-04-28T11:06:58.234Z. Question (activity_type): What type of activity was this — spraying, fertilizing, planting, irrigating, harvesting, scouting, pruning, soil work, or equipment maintenance? Answer: planting, direct seeding, beans, uh green beans. Question (field_block): Where were you working (field, block, or area)? Answer: FIELD J, beds 1 to 6, yes, all six beds. Question (duration_crew): How long did it take and who was with you? Answer: seven forty five to eleven, me plus, plus Rosa, two of us. Question (details): Seeder, spacing, water? Answer: push seeder, uh two inch spacing, one inch deep, ran the drip for, for thirty minutes after, germination cover on beds 5 and 6. Question (issues): Gaps or jams? Answer: seeder jammed twice on bed 3, no, re-seeded the gaps, uh seed lot 2214, yes.",
  },
  {
    id: "log-benjamin-moore",
    employee: "Benjamin Moore",
    activity: "Pest Control",
    date: "April 29, 2026",
    isoDate: "2026-04-29",
    field: "FIELD K",
    time: "6:30 AM - 10:30 AM",
    status: "reviewed",
    summary:
      "Offline guided voice log created at 2026-04-29T10:38:07.889Z. Question (activity_type): What type of activity was this — spraying, fertilizing, planting, irrigating, harvesting, scouting, pruning, soil work, or equipment maintenance? Answer: spraying, pest control, uh mites, mites on the cucumbers. Question (field_block): Where were you working (field, block, or area)? Answer: FIELD K, high tunnel 2 and, and beds 14, 15, 16 outside. Question (duration_crew): How long did it take and who was with you? Answer: six thirty to ten thirty, me and, uh, Devon, both in PPE. Question (details): Product, rate, REI? Answer: neem oil, uh two percent, backpack sprayer, full coverage under leaves, REI four hours, sign, sign posted. Question (issues): Drift or reactions? Answer: no drift, wind under, under five, rinse station, uh, restocked, recheck in, in five days.",
  },
];
