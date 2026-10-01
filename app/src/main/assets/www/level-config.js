// Edjay's Life Organizer V3 — easy leveling balance file
// Edit only the numbers below to rebalance progression.
window.EDJAY_LEVEL_CONFIG = {
  levels: [
    { name: 'Spoiled', min: 0 },
    { name: 'Messy', min: 1500 },
    { name: 'Drifter', min: 3500 },
    { name: 'Getting Serious', min: 6000 },
    { name: 'Responsible', min: 9500 },
    { name: 'Organized', min: 14000 },
    { name: 'Consistent', min: 20000 },
    { name: 'Disciplined', min: 28000 },
    { name: 'Dependable', min: 38000 },
    { name: 'Self-Mastered', min: 50000 }
  ],
  xp: {
    task: { Small: 10, Normal: 20, Important: 40 },
    miss: { Small: 5, Normal: 10, Important: 20 },
    routine: 30,
    workout: 50,
    perfect: 50,
    thesis: 100,
    schedule: 5,
    unexpected: 10
  },
  notes: 'Higher thresholds are intentional so one good day cannot jump several life ranks.'
};
