// Built-in exercise library.
// type: 'weight' (weight × reps) | 'bw' (reps, optional added weight) | 'time' (hold seconds)
//       'cardio' (distance + duration) | 'sprint' (each set = one sprint: distance + time)

export const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Cardio'];
export const EQUIPMENT = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Kettlebell', 'Smith', 'Other'];

const x = (id, name, muscle, equip, type = 'weight', secondary = [], rest) => ({ id, name, muscle, equip, type, secondary, ...(rest ? { rest } : {}) });

export const EXERCISES = [
  // Chest
  x('bench', 'Bench Press', 'Chest', 'Barbell', 'weight', ['Triceps', 'Shoulders'], 180),
  x('incline-bench', 'Incline Bench Press', 'Chest', 'Barbell', 'weight', ['Shoulders', 'Triceps'], 150),
  x('db-bench', 'Dumbbell Bench Press', 'Chest', 'Dumbbell', 'weight', ['Triceps', 'Shoulders']),
  x('incline-db', 'Incline Dumbbell Press', 'Chest', 'Dumbbell', 'weight', ['Shoulders', 'Triceps']),
  x('chest-press', 'Machine Chest Press', 'Chest', 'Machine', 'weight', ['Triceps']),
  x('cable-fly', 'Cable Fly', 'Chest', 'Cable', 'weight', [], 75),
  x('pec-deck', 'Pec Deck', 'Chest', 'Machine', 'weight', [], 75),
  x('dips', 'Dips', 'Chest', 'Bodyweight', 'bw', ['Triceps', 'Shoulders']),
  x('pushup', 'Push-up', 'Chest', 'Bodyweight', 'bw', ['Triceps'], 60),
  // Back
  x('deadlift', 'Deadlift', 'Back', 'Barbell', 'weight', ['Hamstrings', 'Glutes'], 210),
  x('row', 'Barbell Row', 'Back', 'Barbell', 'weight', ['Biceps'], 150),
  x('db-row', 'Dumbbell Row', 'Back', 'Dumbbell', 'weight', ['Biceps']),
  x('pullup', 'Pull-up', 'Back', 'Bodyweight', 'bw', ['Biceps'], 150),
  x('chinup', 'Chin-up', 'Back', 'Bodyweight', 'bw', ['Biceps'], 150),
  x('lat-pulldown', 'Lat Pulldown', 'Back', 'Cable', 'weight', ['Biceps']),
  x('cable-row', 'Seated Cable Row', 'Back', 'Cable', 'weight', ['Biceps']),
  x('tbar-row', 'T-Bar Row', 'Back', 'Barbell', 'weight', ['Biceps']),
  x('chest-row', 'Chest-Supported Row', 'Back', 'Machine', 'weight', ['Biceps']),
  x('straight-pulldown', 'Straight-Arm Pulldown', 'Back', 'Cable', 'weight', [], 75),
  // Shoulders
  x('ohp', 'Overhead Press', 'Shoulders', 'Barbell', 'weight', ['Triceps'], 150),
  x('db-shoulder', 'Dumbbell Shoulder Press', 'Shoulders', 'Dumbbell', 'weight', ['Triceps']),
  x('lateral-raise', 'Lateral Raise', 'Shoulders', 'Dumbbell', 'weight', [], 60),
  x('cable-lateral', 'Cable Lateral Raise', 'Shoulders', 'Cable', 'weight', [], 60),
  x('rear-delt', 'Rear Delt Fly', 'Shoulders', 'Machine', 'weight', [], 60),
  x('face-pull', 'Face Pull', 'Shoulders', 'Cable', 'weight', ['Back'], 60),
  // Arms
  x('bb-curl', 'Barbell Curl', 'Biceps', 'Barbell', 'weight', [], 75),
  x('db-curl', 'Dumbbell Curl', 'Biceps', 'Dumbbell', 'weight', [], 75),
  x('hammer-curl', 'Hammer Curl', 'Biceps', 'Dumbbell', 'weight', [], 75),
  x('preacher-curl', 'Preacher Curl', 'Biceps', 'Machine', 'weight', [], 75),
  x('cable-curl', 'Cable Curl', 'Biceps', 'Cable', 'weight', [], 60),
  x('pushdown', 'Triceps Pushdown', 'Triceps', 'Cable', 'weight', [], 60),
  x('oh-ext', 'Overhead Triceps Extension', 'Triceps', 'Cable', 'weight', [], 60),
  x('skullcrusher', 'Skull Crusher', 'Triceps', 'Barbell', 'weight', [], 75),
  x('cgbp', 'Close-Grip Bench Press', 'Triceps', 'Barbell', 'weight', ['Chest'], 120),
  // Legs
  x('squat', 'Back Squat', 'Quads', 'Barbell', 'weight', ['Glutes', 'Hamstrings'], 210),
  x('front-squat', 'Front Squat', 'Quads', 'Barbell', 'weight', ['Glutes', 'Core'], 180),
  x('leg-press', 'Leg Press', 'Quads', 'Machine', 'weight', ['Glutes'], 150),
  x('hack-squat', 'Hack Squat', 'Quads', 'Machine', 'weight', ['Glutes'], 150),
  x('bulgarian', 'Bulgarian Split Squat', 'Quads', 'Dumbbell', 'weight', ['Glutes']),
  x('lunge', 'Walking Lunge', 'Quads', 'Dumbbell', 'weight', ['Glutes']),
  x('leg-ext', 'Leg Extension', 'Quads', 'Machine', 'weight', [], 75),
  x('rdl', 'Romanian Deadlift', 'Hamstrings', 'Barbell', 'weight', ['Glutes', 'Back'], 150),
  x('leg-curl', 'Lying Leg Curl', 'Hamstrings', 'Machine', 'weight', [], 75),
  x('seated-curl', 'Seated Leg Curl', 'Hamstrings', 'Machine', 'weight', [], 75),
  x('hip-thrust', 'Hip Thrust', 'Glutes', 'Barbell', 'weight', ['Hamstrings'], 120),
  x('calf-raise', 'Standing Calf Raise', 'Calves', 'Machine', 'weight', [], 60),
  x('seated-calf', 'Seated Calf Raise', 'Calves', 'Machine', 'weight', [], 60),
  // Core
  x('plank', 'Plank', 'Core', 'Bodyweight', 'time', [], 60),
  x('hanging-raise', 'Hanging Leg Raise', 'Core', 'Bodyweight', 'bw', [], 60),
  x('cable-crunch', 'Cable Crunch', 'Core', 'Cable', 'weight', [], 60),
  x('ab-wheel', 'Ab Wheel Rollout', 'Core', 'Other', 'bw', [], 60),
  // Conditioning
  x('sprint', 'Sprints', 'Cardio', 'Other', 'sprint', [], 90),
  x('hill-sprint', 'Hill Sprints', 'Cardio', 'Other', 'sprint', [], 90),
  x('run', 'Run', 'Cardio', 'Other', 'cardio', [], 0),
  x('bike', 'Bike', 'Cardio', 'Other', 'cardio', [], 0),
  x('incline-walk', 'Incline Walk', 'Cardio', 'Machine', 'cardio', [], 0),
  x('rower', 'Rower', 'Cardio', 'Machine', 'cardio', [], 0),
  x('stairmaster', 'Stair Climber', 'Cardio', 'Machine', 'cardio', [], 0),
];

// Templates: [name, [[exerciseId, sets, reps]]]
const day = (name, items) => ({ name, items: items.map(([exId, sets, reps]) => ({ exId, sets, reps })) });

export const TEMPLATES = [
  {
    id: 'ppl', name: 'Push / Pull / Legs', blurb: '6 days, each muscle twice a week',
    days: [
      day('Push A', [['bench', 4, 6], ['ohp', 3, 8], ['incline-db', 3, 10], ['lateral-raise', 3, 15], ['pushdown', 3, 12]]),
      day('Pull A', [['deadlift', 3, 5], ['pullup', 3, 8], ['cable-row', 3, 10], ['face-pull', 3, 15], ['bb-curl', 3, 10]]),
      day('Legs A', [['squat', 4, 6], ['rdl', 3, 8], ['leg-press', 3, 12], ['leg-curl', 3, 12], ['calf-raise', 4, 12]]),
      day('Push B', [['ohp', 4, 6], ['incline-bench', 3, 8], ['cable-fly', 3, 12], ['cable-lateral', 3, 15], ['oh-ext', 3, 12]]),
      day('Pull B', [['row', 4, 8], ['lat-pulldown', 3, 10], ['chest-row', 3, 12], ['rear-delt', 3, 15], ['hammer-curl', 3, 12]]),
      day('Legs B', [['front-squat', 3, 8], ['hip-thrust', 3, 10], ['bulgarian', 3, 10], ['seated-curl', 3, 12], ['seated-calf', 4, 15]]),
    ],
  },
  {
    id: 'ul', name: 'Upper / Lower', blurb: '4 days, strength and size',
    days: [
      day('Upper A', [['bench', 4, 6], ['row', 4, 8], ['ohp', 3, 8], ['lat-pulldown', 3, 10], ['db-curl', 2, 12], ['pushdown', 2, 12]]),
      day('Lower A', [['squat', 4, 6], ['rdl', 3, 8], ['leg-ext', 3, 12], ['leg-curl', 3, 12], ['calf-raise', 3, 12]]),
      day('Upper B', [['incline-db', 3, 10], ['pullup', 3, 8], ['db-shoulder', 3, 10], ['cable-row', 3, 12], ['lateral-raise', 3, 15]]),
      day('Lower B', [['deadlift', 3, 5], ['leg-press', 3, 12], ['bulgarian', 3, 10], ['seated-curl', 3, 12], ['hanging-raise', 3, 12]]),
    ],
  },
  {
    id: 'fb', name: 'Full Body', blurb: '3 days, simple and efficient',
    days: [
      day('Full Body A', [['squat', 3, 6], ['bench', 3, 6], ['row', 3, 8], ['lateral-raise', 2, 15], ['plank', 3, 45]]),
      day('Full Body B', [['deadlift', 3, 5], ['ohp', 3, 8], ['pullup', 3, 8], ['leg-curl', 2, 12], ['db-curl', 2, 12]]),
      day('Full Body C', [['front-squat', 3, 8], ['incline-db', 3, 10], ['cable-row', 3, 10], ['hip-thrust', 3, 10], ['pushdown', 2, 12]]),
    ],
  },
  {
    id: 'cond', name: 'Conditioning', blurb: 'Sprints, runs and rides',
    days: [
      day('Sprint Intervals', [['sprint', 8, 1]]),
      day('Easy Run', [['run', 1, 1]]),
      day('Bike Ride', [['bike', 1, 1]]),
    ],
  },
];
