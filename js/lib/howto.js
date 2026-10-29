// How-to guides for the built-in exercises: setup and steps, then cues and common mistakes.
// Custom exercises use the notes the user writes in their own exercise.

const H = (steps, tips) => ({ steps, tips });

export const HOWTO = {
  bench: H([
    'Lie on the bench with your eyes under the bar and feet flat on the floor.',
    'Grip slightly wider than shoulder width, squeeze your shoulder blades together and down.',
    'Unrack, then lower the bar under control to your mid chest, elbows about 45° from your body.',
    'Press back up and slightly toward your face until your arms are straight.',
  ], ['Keep your butt on the bench and a slight arch in your upper back.', 'Use a spotter or safety arms when going heavy.']),
  'incline-bench': H([
    'Set the bench to 30–45° and lie with your eyes under the bar.',
    'Grip just wider than shoulder width, shoulder blades pinched back.',
    'Lower the bar to your upper chest, just below the collarbones.',
    'Press straight up until your arms are locked out.',
  ], ['A steeper bench turns it into a shoulder press. Around 30° keeps the focus on upper chest.']),
  'db-bench': H([
    'Sit with the dumbbells on your thighs, then lie back and bring them up over your chest.',
    'Lower them to the sides of your chest, elbows slightly tucked.',
    'Press up and slightly in until the dumbbells nearly touch.',
  ], ['Dumbbells let each side work on its own, which helps fix imbalances.', 'Lower slowly. Most of the work is in control, not speed.']),
  'incline-db': H([
    'Set the bench to 30–45°, kick the dumbbells up as you lie back.',
    'Start with the weights over your upper chest, palms forward.',
    'Lower to the sides of your upper chest, then press back up.',
  ], ['Keep your shoulder blades back so your front delts don\'t take over.']),
  'chest-press': H([
    'Adjust the seat so the handles line up with your mid chest.',
    'Sit tall with your back against the pad and grab the handles.',
    'Press forward until your arms are straight, then return slowly.',
  ], ['Great for pushing close to failure safely, since there\'s no bar to get stuck under.']),
  'cable-fly': H([
    'Set both pulleys around shoulder height and take a handle in each hand.',
    'Step forward into a split stance with a slight bend in your elbows.',
    'Bring your hands together in front of your chest in a wide arc.',
    'Open back up slowly until you feel a stretch across your chest.',
  ], ['Keep the elbow bend fixed. If it changes, it turns into a press.']),
  'pec-deck': H([
    'Set the seat so the handles are at chest height.',
    'Sit with your back flat against the pad, elbows slightly bent.',
    'Squeeze the handles together in front of you, pause, then return slowly.',
  ], ['Don\'t let the weight stack slam between reps. Keep tension on.']),
  dips: H([
    'Grip the bars and jump up to straight arms, shoulders down away from your ears.',
    'Lean slightly forward and lower until your upper arms are about parallel to the floor.',
    'Push back up to straight arms.',
  ], ['Leaning forward hits chest more. Staying upright hits triceps more.', 'Stop the descent if your shoulders feel pinched.']),
  pushup: H([
    'Hands slightly wider than shoulders, body in a straight line from head to heels.',
    'Lower your chest to just above the floor, elbows about 45° from your body.',
    'Press back up to straight arms.',
  ], ['Squeeze your glutes and brace your abs so your hips don\'t sag.']),
  deadlift: H([
    'Stand with mid-foot under the bar, feet about hip width.',
    'Hinge down and grip the bar just outside your legs. Shins touch the bar.',
    'Brace your core, flatten your back and pull the slack out of the bar.',
    'Drive through the floor and stand up tall, keeping the bar against your legs. Lower it the same way.',
  ], ['Your back should stay flat the whole rep. If it rounds, the weight is too heavy.', 'Push the floor away rather than yanking the bar.']),
  row: H([
    'Hold the bar with an overhand grip, hinge forward until your torso is about 45° or lower.',
    'Let the bar hang at arm\'s length with a flat back.',
    'Pull the bar to your lower ribs, squeezing your shoulder blades together.',
    'Lower under control.',
  ], ['Keep your torso still. Swinging means the weight is too heavy.']),
  'db-row': H([
    'Put one knee and hand on a bench, other foot on the floor, back flat.',
    'Let the dumbbell hang straight down from your shoulder.',
    'Pull it toward your hip, elbow close to your side.',
    'Lower slowly until your arm is straight.',
  ], ['Think about driving your elbow back, not lifting with your hand.']),
  pullup: H([
    'Hang from the bar with an overhand grip a bit wider than shoulder width.',
    'Pull your shoulders down, then pull your chest toward the bar.',
    'Go until your chin is over the bar, then lower all the way down.',
  ], ['Log added weight with a belt, or use a band or assisted machine to build up.', 'Avoid kicking. Full hang to chin over bar counts as a rep.']),
  chinup: H([
    'Hang from the bar with palms facing you, about shoulder width.',
    'Pull your chest toward the bar, elbows driving down.',
    'Chin over the bar, then lower to a full hang.',
  ], ['Chin-ups use more biceps than pull-ups, so most people get more reps.']),
  'lat-pulldown': H([
    'Set the knee pad so your legs are locked in, grip the bar wider than your shoulders.',
    'Lean back slightly and pull the bar to your upper chest.',
    'Squeeze your lats at the bottom, then let the bar rise slowly until your arms are straight.',
  ], ['Don\'t pull the bar behind your neck.', 'Lead with your elbows, not your hands.']),
  'cable-row': H([
    'Sit with feet on the platform and knees slightly bent, grab the handle.',
    'Sit tall with arms straight in front of you.',
    'Pull the handle to your stomach, squeezing your shoulder blades together.',
    'Let your arms extend fully before the next rep.',
  ], ['Don\'t rock your torso back and forth to move the weight.']),
  'tbar-row': H([
    'Straddle the bar, hinge forward with a flat back and grab the handle.',
    'Pull the weight toward your chest, elbows close to your body.',
    'Lower until your arms are straight.',
  ], ['Keep your chest up and your back flat throughout.']),
  'chest-row': H([
    'Set the seat so your chest rests on the pad and you can reach the handles with straight arms.',
    'Pull the handles back, driving your elbows behind you.',
    'Squeeze, then return slowly.',
  ], ['The chest pad removes lower-back strain, so you can focus on your lats and upper back.']),
  'straight-pulldown': H([
    'Stand facing a high cable with a straight bar or rope, arms extended at shoulder height.',
    'Keeping your arms almost straight, sweep the bar down to your thighs.',
    'Let it rise back slowly.',
  ], ['Hinge slightly at the hips and keep the elbows soft but fixed.']),
  ohp: H([
    'Hold the bar at your collarbones with a grip just wider than your shoulders.',
    'Squeeze your glutes and brace your core.',
    'Press the bar straight up, moving your head back slightly so it clears your chin.',
    'Lock out overhead with the bar over your mid foot, then lower to your collarbones.',
  ], ['Don\'t lean back to finish the rep. Brace and stay stacked.']),
  'db-shoulder': H([
    'Sit on a bench with back support, dumbbells at shoulder height, palms forward.',
    'Press up until your arms are straight.',
    'Lower back to shoulder height.',
  ], ['Stop just short of locking out to keep tension on the shoulders.']),
  'lateral-raise': H([
    'Stand with a dumbbell in each hand at your sides, slight bend in the elbows.',
    'Raise your arms out to the sides until they reach shoulder height.',
    'Lower slowly.',
  ], ['Lead with your elbows and keep the weights light enough to control.', 'Avoid shrugging your shoulders up.']),
  'cable-lateral': H([
    'Stand side-on to a low cable, holding the handle with your far hand.',
    'Raise your arm out to the side to shoulder height.',
    'Lower slowly.',
  ], ['The cable keeps tension at the bottom of the rep, where dumbbells go slack.']),
  'rear-delt': H([
    'Sit facing the pec deck pad with the handles set to the rear position.',
    'Grip the handles with arms out in front, slight bend in the elbows.',
    'Pull your arms out and back in a wide arc, then return slowly.',
  ], ['Light weight and strict form work best for rear delts.']),
  'face-pull': H([
    'Set a cable with a rope at upper chest height or higher.',
    'Pull the rope toward your face, separating the ends as your hands come past your ears.',
    'Finish with elbows high and hands next to your head, then return slowly.',
  ], ['Great for shoulder health. Keep it light and controlled.']),
  'bb-curl': H([
    'Stand holding the bar with an underhand grip, shoulder width.',
    'Keep your elbows pinned at your sides and curl the bar up to your shoulders.',
    'Lower slowly until your arms are straight.',
  ], ['Swinging your back means the weight is too heavy.']),
  'db-curl': H([
    'Stand with a dumbbell in each hand, palms forward.',
    'Curl the weights up, keeping your elbows at your sides.',
    'Squeeze at the top, then lower slowly.',
  ], ['Alternate arms or curl both together, both work.']),
  'hammer-curl': H([
    'Hold the dumbbells at your sides with palms facing each other.',
    'Curl them up without turning your wrists.',
    'Lower slowly.',
  ], ['Also builds the forearm and the outer part of the upper arm.']),
  'preacher-curl': H([
    'Sit with the backs of your upper arms flat on the pad.',
    'Curl the handle or bar up toward your shoulders.',
    'Lower slowly until your arms are almost straight.',
  ], ['Don\'t drop fast at the bottom. That\'s where the biceps is most vulnerable.']),
  'cable-curl': H([
    'Stand facing a low cable with a bar or rope.',
    'Curl the handle toward your shoulders with elbows at your sides.',
    'Lower until your arms are straight.',
  ], ['Constant cable tension makes these a good finisher.']),
  pushdown: H([
    'Stand facing a high cable with a bar or rope, elbows tucked at your sides.',
    'Push the handle down until your arms are straight.',
    'Let it rise until your forearms are about parallel to the floor.',
  ], ['Only your forearms should move. Keep your elbows pinned.']),
  'oh-ext': H([
    'Face away from a cable set low, holding a rope behind your head.',
    'Step forward, elbows pointing up, upper arms beside your ears.',
    'Extend your arms overhead until straight, then bend back down.',
  ], ['Training the triceps in a stretched position like this is great for growth.']),
  skullcrusher: H([
    'Lie on a bench holding an EZ bar or barbell over your chest with straight arms.',
    'Bend at the elbows to lower the bar toward your forehead or just behind your head.',
    'Extend your arms back to straight.',
  ], ['Keep your upper arms still and use a weight you can control.']),
  cgbp: H([
    'Set up like a bench press but grip about shoulder width.',
    'Lower the bar to your lower chest, elbows tucked close.',
    'Press back up to lockout.',
  ], ['Too narrow a grip strains the wrists. Shoulder width is enough.']),
  squat: H([
    'Set the bar on your upper back, feet about shoulder width, toes slightly out.',
    'Brace your core and take a big breath.',
    'Sit down and back between your hips until your thighs are at least parallel.',
    'Drive up through your whole foot to standing.',
  ], ['Knees track over your toes. Letting them cave in is a sign to lighten up.', 'Use safety bars in the rack.']),
  'front-squat': H([
    'Rest the bar on the front of your shoulders, elbows high.',
    'Feet shoulder width, brace your core.',
    'Squat down keeping your torso upright, elbows up.',
    'Stand back up.',
  ], ['If your wrists are tight, cross your arms over the bar or use straps.']),
  'leg-press': H([
    'Sit with your back flat on the pad and feet shoulder width on the platform.',
    'Release the safety and lower the platform until your knees reach about 90°.',
    'Press back up without locking your knees.',
  ], ['Higher feet use more glutes and hamstrings, lower feet more quads.', 'Don\'t let your lower back peel off the pad.']),
  'hack-squat': H([
    'Stand on the platform with your back and shoulders against the pads.',
    'Release the handles and squat down until your thighs are at least parallel.',
    'Drive back up.',
  ], ['A great quad builder with less lower-back load than a barbell squat.']),
  bulgarian: H([
    'Stand a stride in front of a bench and rest the top of your back foot on it.',
    'Holding dumbbells, lower until your back knee nearly touches the floor.',
    'Drive up through your front heel. Finish all reps, then switch legs.',
  ], ['A small forward lean adds glutes, upright adds quads.']),
  lunge: H([
    'Hold dumbbells at your sides and take a long step forward.',
    'Lower until your back knee nearly touches the floor.',
    'Push off and step the back leg through into the next lunge.',
  ], ['Count each leg as one rep, or log reps per leg, just be consistent.']),
  'leg-ext': H([
    'Sit with your knees at the edge of the seat and the pad on your lower shins.',
    'Straighten your legs fully and squeeze your quads.',
    'Lower slowly.',
  ], ['Hold the handles to keep your hips down.']),
  rdl: H([
    'Stand holding the bar at your hips, knees slightly bent.',
    'Push your hips back and slide the bar down your thighs, keeping your back flat.',
    'Go until you feel a strong hamstring stretch, usually just below the knees.',
    'Drive your hips forward to stand back up.',
  ], ['Your knees stay at the same bend the whole time. It\'s a hip hinge, not a squat.']),
  'leg-curl': H([
    'Lie face down with the pad just above your heels.',
    'Curl your heels toward your glutes.',
    'Lower slowly until your legs are almost straight.',
  ], ['Keep your hips pressed into the pad.']),
  'seated-curl': H([
    'Sit with the pad behind your lower calves and the thigh pad locked down.',
    'Curl your heels down and back under the seat.',
    'Return slowly.',
  ], ['Leaning your torso forward increases the hamstring stretch.']),
  'hip-thrust': H([
    'Sit with your upper back against a bench and a padded bar over your hips.',
    'Feet flat, about hip width, knees bent.',
    'Drive your hips up until your body is flat from shoulders to knees.',
    'Squeeze your glutes at the top, then lower.',
  ], ['Tuck your chin and keep your ribs down so your lower back doesn\'t arch.']),
  'calf-raise': H([
    'Stand with the balls of your feet on the platform and shoulders under the pads.',
    'Lower your heels as far as they go.',
    'Rise up as high as possible onto your toes and pause.',
  ], ['Slow down and pause at the bottom. Bouncing takes the work off your calves.']),
  'seated-calf': H([
    'Sit with the pad on your lower thighs and the balls of your feet on the platform.',
    'Lower your heels for a full stretch.',
    'Push up onto your toes, pause, then lower.',
  ], ['Bent knees shift the work to the deeper calf muscle (soleus).']),
  plank: H([
    'Forearms on the floor, elbows under shoulders, body straight from head to heels.',
    'Brace your abs and squeeze your glutes.',
    'Hold the position for the target time.',
  ], ['Once you can hold for over a minute, make it harder rather than longer.']),
  'hanging-raise': H([
    'Hang from a bar with a firm grip.',
    'Raise your legs in front of you to at least hip height, knees bent or straight.',
    'Lower slowly without swinging.',
  ], ['Curl your pelvis up at the top to really work the abs.']),
  'cable-crunch': H([
    'Kneel facing a high cable, holding a rope beside your head.',
    'Crunch down, bringing your elbows toward your knees.',
    'Return slowly to upright.',
  ], ['Your hips stay still. Round through your spine.']),
  'ab-wheel': H([
    'Kneel and hold the wheel under your shoulders.',
    'Roll forward slowly, keeping your abs braced and back flat.',
    'Go as far as you can control, then pull back to start.',
  ], ['If your lower back sags, shorten the range.']),
  sprint: H([
    'Warm up well: easy jog, then a few build-up runs at 60–80% effort.',
    'Sprint the set distance at full effort with tall posture and fast arms.',
    'Walk back or rest fully between sprints so each one is high quality.',
    'Log each sprint as a set with its distance and time.',
  ], ['Rest about 1–2 minutes per 100 m. Tired sprints are just running.', 'Use the same distance to compare times over weeks.']),
  'hill-sprint': H([
    'Find a moderate hill and warm up.',
    'Sprint up for the set distance or time, driving your knees and arms.',
    'Walk back down to recover fully.',
  ], ['Hills are easier on the hamstrings than flat sprints, a good way to start.']),
  run: H([
    'Start with a few minutes of easy jogging.',
    'Run at your planned pace, conversational for easy runs.',
    'Log total distance and time when you finish.',
  ], ['Most of your running should be easy enough to talk in full sentences.']),
  bike: H([
    'Set the seat so your knee is slightly bent at the bottom of the pedal stroke.',
    'Ride at your planned effort.',
    'Log total distance and time.',
  ], ['Biking is easy on the joints, so it\'s good on recovery days.']),
  'incline-walk': H([
    'Set the treadmill to an incline between 5 and 15%.',
    'Walk at a brisk pace without holding the rails.',
    'Log distance and time at the end.',
  ], ['A low-stress way to add calorie burn during a cut.']),
  rower: H([
    'Strap your feet in and grab the handle with straight arms.',
    'Push with your legs first, then lean back slightly, then pull the handle to your lower ribs.',
    'Reverse the order on the way back: arms, body, then legs.',
  ], ['Legs do most of the work. It\'s about 60% legs, 20% back, 20% arms.']),
  stairmaster: H([
    'Step on and set a steady speed.',
    'Climb with an upright posture, using the rails only for balance.',
    'Log time and distance (or floors) when done.',
  ], ['Leaning on the rails takes away most of the benefit.']),
};

// Generic advice when an exercise has no guide of its own.
export function howtoFor(ex) {
  if (!ex) return null;
  if (HOWTO[ex.id]) return HOWTO[ex.id];
  if (ex.howto) return { steps: ex.howto.split('\n').map(x => x.trim()).filter(Boolean), tips: [], custom: true };
  return null;
}
