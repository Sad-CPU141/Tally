// Step-by-step instructions and exercise details from Free Exercise DB
// (public domain, github.com/yuhonas/free-exercise-db), matched to Tally's built-in exercises.

export const MEDIA = {
 "bench": {
  "src": "Barbell_Bench_Press_-_Medium_Grip",
  "name": "Barbell Bench Press - Medium Grip",
  "photos": 2,
  "steps": [
   "Lie back on a flat bench. Using a medium width grip (a grip that creates a 90-degree angle in the middle of the movement between the forearms and the upper arms), lift the bar from the rack and hold it straight over you with your arms locked. This will be your starting position.",
   "From the starting position, breathe in and begin coming down slowly until the bar touches your middle chest.",
   "After a brief pause, push the bar back to the starting position as you breathe out. Focus on pushing the bar using your chest muscles. Lock your arms and squeeze your chest in the contracted position at the top of the motion, hold for a second and then start coming down slowly again. Tip: Ideally, lowering the weight should take about twice as long as raising it.",
   "Repeat the movement for the prescribed amount of repetitions.",
   "When you are done, place the bar back in the rack."
  ],
  "level": "beginner",
  "force": "push",
  "mechanic": "compound"
 },
 "incline-bench": {
  "src": "Barbell_Incline_Bench_Press_-_Medium_Grip",
  "name": "Barbell Incline Bench Press - Medium Grip",
  "photos": 2,
  "steps": [
   "Lie back on an incline bench. Using a medium-width grip (a grip that creates a 90-degree angle in the middle of the movement between the forearms and the upper arms), lift the bar from the rack and hold it straight over you with your arms locked. This will be your starting position.",
   "As you breathe in, come down slowly until you feel the bar on you upper chest.",
   "After a second pause, bring the bar back to the starting position as you breathe out and push the bar using your chest muscles. Lock your arms in the contracted position, squeeze your chest, hold for a second and then start coming down slowly again. Tip: it should take at least twice as long to go down than to come up.",
   "Repeat the movement for the prescribed amount of repetitions.",
   "When you are done, place the bar back in the rack."
  ],
  "level": "beginner",
  "force": "push",
  "mechanic": "compound"
 },
 "db-bench": {
  "src": "Dumbbell_Bench_Press",
  "name": "Dumbbell Bench Press",
  "photos": 2,
  "steps": [
   "Lie down on a flat bench with a dumbbell in each hand resting on top of your thighs. The palms of your hands will be facing each other.",
   "Then, using your thighs to help raise the dumbbells up, lift the dumbbells one at a time so that you can hold them in front of you at shoulder width.",
   "Once at shoulder width, rotate your wrists forward so that the palms of your hands are facing away from you. The dumbbells should be just to the sides of your chest, with your upper arm and forearm creating a 90 degree angle. Be sure to maintain full control of the dumbbells at all times. This will be your starting position.",
   "Then, as you breathe out, use your chest to push the dumbbells up. Lock your arms at the top of the lift and squeeze your chest, hold for a second and then begin coming down slowly. Tip: Ideally, lowering the weight should take about twice as long as raising it.",
   "Repeat the movement for the prescribed amount of repetitions of your training program."
  ],
  "level": "beginner",
  "force": "push",
  "mechanic": "compound"
 },
 "incline-db": {
  "src": "Incline_Dumbbell_Press",
  "name": "Incline Dumbbell Press",
  "photos": 2,
  "steps": [
   "Lie back on an incline bench with a dumbbell in each hand atop your thighs. The palms of your hands will be facing each other.",
   "Then, using your thighs to help push the dumbbells up, lift the dumbbells one at a time so that you can hold them at shoulder width.",
   "Once you have the dumbbells raised to shoulder width, rotate your wrists forward so that the palms of your hands are facing away from you. This will be your starting position.",
   "Be sure to keep full control of the dumbbells at all times. Then breathe out and push the dumbbells up with your chest.",
   "Lock your arms at the top, hold for a second, and then start slowly lowering the weight. Tip Ideally, lowering the weights should take about twice as long as raising them.",
   "Repeat the movement for the prescribed amount of repetitions.",
   "When you are done, place the dumbbells back on your thighs and then on the floor. This is the safest manner to release the dumbbells."
  ],
  "level": "beginner",
  "force": "push",
  "mechanic": "compound"
 },
 "chest-press": {
  "src": "Leverage_Chest_Press",
  "name": "Leverage Chest Press",
  "photos": 2,
  "steps": [
   "Load an appropriate weight onto the pins and adjust the seat for your height. The handles should be near the bottom or middle of the pectorals at the beginning of the motion.",
   "Your chest and head should be up and your shoulder blades retracted. This will be your starting position.",
   "Press the handles forward by extending through the elbow.",
   "After a brief pause at the top, return the weight just above the start position, keeping tension on the muscles by not returning the weight to the stops until the set is complete."
  ],
  "level": "beginner",
  "force": "push",
  "mechanic": "compound"
 },
 "cable-fly": {
  "src": "Cable_Crossover",
  "name": "Cable Crossover",
  "photos": 2,
  "steps": [
   "To get yourself into the starting position, place the pulleys on a high position (above your head), select the resistance to be used and hold the pulleys in each hand.",
   "Step forward in front of an imaginary straight line between both pulleys while pulling your arms together in front of you. Your torso should have a small forward bend from the waist. This will be your starting position.",
   "With a slight bend on your elbows in order to prevent stress at the biceps tendon, extend your arms to the side (straight out at both sides) in a wide arc until you feel a stretch on your chest. Breathe in as you perform this portion of the movement. Tip: Keep in mind that throughout the movement, the arms and torso should remain stationary; the movement should only occur at the shoulder joint.",
   "Return your arms back to the starting position as you breathe out. Make sure to use the same arc of motion used to lower the weights.",
   "Hold for a second at the starting position and repeat the movement for the prescribed amount of repetitions."
  ],
  "level": "beginner",
  "force": "push",
  "mechanic": "isolation"
 },
 "pec-deck": {
  "src": "Butterfly",
  "name": "Butterfly",
  "photos": 2,
  "steps": [
   "Sit on the machine with your back flat on the pad.",
   "Take hold of the handles. Tip: Your upper arms should be positioned parallel to the floor; adjust the machine accordingly. This will be your starting position.",
   "Push the handles together slowly as you squeeze your chest in the middle. Breathe out during this part of the motion and hold the contraction for a second.",
   "Return back to the starting position slowly as you inhale until your chest muscles are fully stretched.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "beginner",
  "force": "pull",
  "mechanic": "isolation"
 },
 "dips": {
  "src": "Dips_-_Chest_Version",
  "name": "Dips - Chest Version",
  "photos": 2,
  "steps": [
   "For this exercise you will need access to parallel bars. To get yourself into the starting position, hold your body at arms length (arms locked) above the bars.",
   "While breathing in, lower yourself slowly with your torso leaning forward around 30 degrees or so and your elbows flared out slightly until you feel a slight stretch in the chest.",
   "Once you feel the stretch, use your chest to bring your body back to the starting position as you breathe out. Tip: Remember to squeeze the chest at the top of the movement for a second.",
   "Repeat the movement for the prescribed amount of repetitions."
  ],
  "level": "intermediate",
  "force": "push",
  "mechanic": "compound"
 },
 "pushup": {
  "src": "Pushups",
  "name": "Pushups",
  "photos": 2,
  "steps": [
   "Lie on the floor face down and place your hands about 36 inches apart while holding your torso up at arms length.",
   "Next, lower yourself downward until your chest almost touches the floor as you inhale.",
   "Now breathe out and press your upper body back up to the starting position while squeezing your chest.",
   "After a brief pause at the top contracted position, you can begin to lower yourself downward again for as many repetitions as needed."
  ],
  "level": "beginner",
  "force": "push",
  "mechanic": "compound"
 },
 "deadlift": {
  "src": "Barbell_Deadlift",
  "name": "Barbell Deadlift",
  "photos": 2,
  "steps": [
   "Stand in front of a loaded barbell.",
   "While keeping the back as straight as possible, bend your knees, bend forward and grasp the bar using a medium (shoulder width) overhand grip. This will be the starting position of the exercise. Tip: If it is difficult to hold on to the bar with this grip, alternate your grip or use wrist straps.",
   "While holding the bar, start the lift by pushing with your legs while simultaneously getting your torso to the upright position as you breathe out. In the upright position, stick your chest out and contract the back by bringing the shoulder blades back. Think of how the soldiers in the military look when they are in standing in attention.",
   "Go back to the starting position by bending at the knees while simultaneously leaning the torso forward at the waist while keeping the back straight. When the weights on the bar touch the floor you are back at the starting position and ready to perform another repetition.",
   "Perform the amount of repetitions prescribed in the program."
  ],
  "level": "intermediate",
  "force": "pull",
  "mechanic": "compound"
 },
 "row": {
  "src": "Bent_Over_Barbell_Row",
  "name": "Bent Over Barbell Row",
  "photos": 2,
  "steps": [
   "Holding a barbell with a pronated grip (palms facing down), bend your knees slightly and bring your torso forward, by bending at the waist, while keeping the back straight until it is almost parallel to the floor. Tip: Make sure that you keep the head up. The barbell should hang directly in front of you as your arms hang perpendicular to the floor and your torso. This is your starting position.",
   "Now, while keeping the torso stationary, breathe out and lift the barbell to you. Keep the elbows close to the body and only use the forearms to hold the weight. At the top contracted position, squeeze the back muscles and hold for a brief pause.",
   "Then inhale and slowly lower the barbell back to the starting position.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "beginner",
  "force": "pull",
  "mechanic": "compound"
 },
 "db-row": {
  "src": "One-Arm_Dumbbell_Row",
  "name": "One-Arm Dumbbell Row",
  "photos": 2,
  "steps": [
   "Choose a flat bench and place a dumbbell on each side of it.",
   "Place the right leg on top of the end of the bench, bend your torso forward from the waist until your upper body is parallel to the floor, and place your right hand on the other end of the bench for support.",
   "Use the left hand to pick up the dumbbell on the floor and hold the weight while keeping your lower back straight. The palm of the hand should be facing your torso. This will be your starting position.",
   "Pull the resistance straight up to the side of your chest, keeping your upper arm close to your side and keeping the torso stationary. Breathe out as you perform this step. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. Also, make sure that the force is performed with the back muscles and not the arms. Finally, the upper torso should remain stationary and only the arms should move. The forearms should do no other work except for holding the dumbbell; therefore do not try to pull the dumbbell up using the forearms.",
   "Lower the resistance straight down to the starting position. Breathe in as you perform this step.",
   "Repeat the movement for the specified amount of repetitions.",
   "Switch sides and repeat again with the other arm."
  ],
  "level": "beginner",
  "force": "pull",
  "mechanic": "compound"
 },
 "pullup": {
  "src": "Pullups",
  "name": "Pullups",
  "photos": 2,
  "steps": [
   "Grab the pull-up bar with the palms facing forward using the prescribed grip. Note on grips: For a wide grip, your hands need to be spaced out at a distance wider than your shoulder width. For a medium grip, your hands need to be spaced out at a distance equal to your shoulder width and for a close grip at a distance smaller than your shoulder width.",
   "As you have both arms extended in front of you holding the bar at the chosen grip width, bring your torso back around 30 degrees or so while creating a curvature on your lower back and sticking your chest out. This is your starting position.",
   "Pull your torso up until the bar touches your upper chest by drawing the shoulders and the upper arms down and back. Exhale as you perform this portion of the movement. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. The upper torso should remain stationary as it moves through space and only the arms should move. The forearms should do no other work other than hold the bar.",
   "After a second on the contracted position, start to inhale and slowly lower your torso back to the starting position when your arms are fully extended and the lats are fully stretched.",
   "Repeat this motion for the prescribed amount of repetitions."
  ],
  "level": "beginner",
  "force": "pull",
  "mechanic": "compound"
 },
 "chinup": {
  "src": "Chin-Up",
  "name": "Chin-Up",
  "photos": 2,
  "steps": [
   "Grab the pull-up bar with the palms facing your torso and a grip closer than the shoulder width.",
   "As you have both arms extended in front of you holding the bar at the chosen grip width, keep your torso as straight as possible while creating a curvature on your lower back and sticking your chest out. This is your starting position. Tip: Keeping the torso as straight as possible maximizes biceps stimulation while minimizing back involvement.",
   "As you breathe out, pull your torso up until your head is around the level of the pull-up bar. Concentrate on using the biceps muscles in order to perform the movement. Keep the elbows close to your body. Tip: The upper torso should remain stationary as it moves through space and only the arms should move. The forearms should do no other work other than hold the bar.",
   "After a second of squeezing the biceps in the contracted position, slowly lower your torso back to the starting position; when your arms are fully extended. Breathe in as you perform this portion of the movement.",
   "Repeat this motion for the prescribed amount of repetitions."
  ],
  "level": "beginner",
  "force": "pull",
  "mechanic": "compound"
 },
 "lat-pulldown": {
  "src": "Close-Grip_Front_Lat_Pulldown",
  "name": "Close-Grip Front Lat Pulldown",
  "photos": 2,
  "steps": [
   "Sit down on a pull-down machine with a wide bar attached to the top pulley. Make sure that you adjust the knee pad of the machine to fit your height. These pads will prevent your body from being raised by the resistance attached to the bar.",
   "Grab the bar with the palms facing forward using the prescribed grip. Note on grips: For a wide grip, your hands need to be spaced out at a distance wider than your shoulder width. For a medium grip, your hands need to be spaced out at a distance equal to your shoulder width and for a close grip at a distance smaller than your shoulder width.",
   "As you have both arms extended in front of you - while holding the bar at the chosen grip width - bring your torso back around 30 degrees or so while creating a curvature on your lower back and sticking your chest out. This is your starting position.",
   "As you breathe out, bring the bar down until it touches your upper chest by drawing the shoulders and the upper arms down and back. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. The upper torso should remain stationary (only the arms should move). The forearms should do no other work except for holding the bar; therefore do not try to pull the bar down using the forearms.",
   "After a second in the contracted position, while squeezing your shoulder blades together, slowly raise the bar back to the starting position when your arms are fully extended and the lats are fully stretched. Inhale during this portion of the movement.",
   "6. Repeat this motion for the prescribed amount of repetitions."
  ],
  "level": "beginner",
  "force": "pull",
  "mechanic": "compound"
 },
 "cable-row": {
  "src": "Seated_Cable_Rows",
  "name": "Seated Cable Rows",
  "photos": 2,
  "steps": [
   "For this exercise you will need access to a low pulley row machine with a V-bar. Note: The V-bar will enable you to have a neutral grip where the palms of your hands face each other. To get into the starting position, first sit down on the machine and place your feet on the front platform or crossbar provided making sure that your knees are slightly bent and not locked.",
   "Lean over as you keep the natural alignment of your back and grab the V-bar handles.",
   "With your arms extended pull back until your torso is at a 90-degree angle from your legs. Your back should be slightly arched and your chest should be sticking out. You should be feeling a nice stretch on your lats as you hold the bar in front of you. This is the starting position of the exercise.",
   "Keeping the torso stationary, pull the handles back towards your torso while keeping the arms close to it until you touch the abdominals. Breathe out as you perform that movement. At that point you should be squeezing your back muscles hard. Hold that contraction for a second and slowly go back to the original position while breathing in.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "beginner",
  "force": "pull",
  "mechanic": "compound"
 },
 "tbar-row": {
  "src": "T-Bar_Row_with_Handle",
  "name": "T-Bar Row with Handle",
  "photos": 2,
  "steps": [
   "Position a bar into a landmine or in a corner to keep it from moving. Load an appropriate weight onto your end.",
   "Stand over the bar, and position a Double D row handle around the bar next to the collar. Using your hips and legs, rise to a standing position.",
   "Assume a wide stance with your hips back and your chest up. Your arms should be extended. This will be your starting position.",
   "Pull the weight to your upper abdomen by retracting the shoulder blades and flexing the elbows. Do not jerk the weight or cheat during the movement.",
   "After a brief pause, return to the starting position."
  ],
  "level": "beginner",
  "force": "pull",
  "mechanic": "compound"
 },
 "chest-row": {
  "src": "Dumbbell_Incline_Row",
  "name": "Dumbbell Incline Row",
  "photos": 2,
  "steps": [
   "Using a neutral grip, lean into an incline bench.",
   "Take a dumbbell in each hand with a neutral grip, beginning with the arms straight. This will be your starting position.",
   "Retract the shoulder blades and flex the elbows to row the dumbbells to your side.",
   "Pause at the top of the motion, and then return to the starting position."
  ],
  "level": "beginner",
  "force": "pull",
  "mechanic": "compound"
 },
 "straight-pulldown": {
  "src": "Straight-Arm_Pulldown",
  "name": "Straight-Arm Pulldown",
  "photos": 2,
  "steps": [
   "You will start by grabbing the wide bar from the top pulley of a pulldown machine and using a wider than shoulder-width pronated (palms down) grip. Step backwards two feet or so.",
   "Bend your torso forward at the waist by around 30-degrees with your arms fully extended in front of you and a slight bend at the elbows. If your arms are not fully extended then you need to step a bit more backwards until they are. Once your arms are fully extended and your torso is slightly bent at the waist, tighten the lats and then you are ready to begin.",
   "While keeping the arms straight, pull the bar down by contracting the lats until your hands are next to the side of the thighs. Breathe out as you perform this step.",
   "While keeping the arms straight, go back to the starting position while breathing in.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "beginner",
  "force": "pull",
  "mechanic": "isolation"
 },
 "ohp": {
  "src": "Barbell_Shoulder_Press",
  "name": "Barbell Shoulder Press",
  "photos": 2,
  "steps": [
   "Sit on a bench with back support in a squat rack. Position a barbell at a height that is just above your head. Grab the barbell with a pronated grip (palms facing forward).",
   "Once you pick up the barbell with the correct grip width, lift the bar up over your head by locking your arms. Hold at about shoulder level and slightly in front of your head. This is your starting position.",
   "Lower the bar down to the shoulders slowly as you inhale.",
   "Lift the bar back up to the starting position as you exhale.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "intermediate",
  "force": "push",
  "mechanic": "compound"
 },
 "db-shoulder": {
  "src": "Dumbbell_Shoulder_Press",
  "name": "Dumbbell Shoulder Press",
  "photos": 2,
  "steps": [
   "While holding a dumbbell in each hand, sit on a military press bench or utility bench that has back support. Place the dumbbells upright on top of your thighs.",
   "Now raise the dumbbells to shoulder height one at a time using your thighs to help propel them up into position.",
   "Make sure to rotate your wrists so that the palms of your hands are facing forward. This is your starting position.",
   "Now, exhale and push the dumbbells upward until they touch at the top.",
   "Then, after a brief pause at the top contracted position, slowly lower the weights back down to the starting position while inhaling.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "intermediate",
  "force": "push",
  "mechanic": "compound"
 },
 "lateral-raise": {
  "src": "Side_Lateral_Raise",
  "name": "Side Lateral Raise",
  "photos": 2,
  "steps": [
   "Pick a couple of dumbbells and stand with a straight torso and the dumbbells by your side at arms length with the palms of the hand facing you. This will be your starting position.",
   "While maintaining the torso in a stationary position (no swinging), lift the dumbbells to your side with a slight bend on the elbow and the hands slightly tilted forward as if pouring water in a glass. Continue to go up until you arms are parallel to the floor. Exhale as you execute this movement and pause for a second at the top.",
   "Lower the dumbbells back down slowly to the starting position as you inhale.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "beginner",
  "force": "push",
  "mechanic": "isolation"
 },
 "cable-lateral": {
  "src": "Cable_Seated_Lateral_Raise",
  "name": "Cable Seated Lateral Raise",
  "photos": 2,
  "steps": [
   "Stand in the middle of two low pulleys that are opposite to each other and place a flat bench right behind you (in perpendicular fashion to you; the narrow edge of the bench should be the one behind you). Select the weight to be used on each pulley.",
   "Now sit at the edge of the flat bench behind you with your feet placed in front of your knees.",
   "Bend forward while keeping your back flat and rest your torso on the thighs.",
   "Have someone give you the single handles attached to the pulleys. Grasp the left pulley with the right hand and the right pulley with the left after you select your weight. The pulleys should run under your knees and your arms will be extended with palms facing each other and a slight bend at the elbows. This will be the starting position.",
   "While keeping the arms stationary, raise the upper arms to the sides until they are parallel to the floor and at shoulder height. Exhale during the execution of this movement and hold the contraction for a second.",
   "Slowly lower your arms to the starting position as you inhale.",
   "Repeat for the recommended amount of repetitions. Tip: Maintain upper arms perpendicular to torso and a fixed elbow position (10 degree to 30 degree angle) throughout exercise."
  ],
  "level": "beginner",
  "force": "pull",
  "mechanic": "isolation"
 },
 "rear-delt": {
  "src": "Reverse_Machine_Flyes",
  "name": "Reverse Machine Flyes",
  "photos": 2,
  "steps": [
   "Adjust the handles so that they are fully to the rear. Make an appropriate weight selection and adjust the seat height so the handles are at shoulder level. Grasp the handles with your hands facing inwards. This will be your starting position.",
   "In a semicircular motion, pull your hands out to your side and back, contracting your rear delts.",
   "Keep your arms slightly bent throughout the movement, with all of the motion occurring at the shoulder joint.",
   "Pause at the rear of the movement, and slowly return the weight to the starting position."
  ],
  "level": "beginner",
  "force": "pull",
  "mechanic": "isolation"
 },
 "face-pull": {
  "src": "Face_Pull",
  "name": "Face Pull",
  "photos": 2,
  "steps": [
   "Facing a high pulley with a rope or dual handles attached, pull the weight directly towards your face, separating your hands as you do so. Keep your upper arms parallel to the ground."
  ],
  "level": "intermediate",
  "force": "pull",
  "mechanic": "compound"
 },
 "bb-curl": {
  "src": "Barbell_Curl",
  "name": "Barbell Curl",
  "photos": 2,
  "steps": [
   "Stand up with your torso upright while holding a barbell at a shoulder-width grip. The palm of your hands should be facing forward and the elbows should be close to the torso. This will be your starting position.",
   "While holding the upper arms stationary, curl the weights forward while contracting the biceps as you breathe out. Tip: Only the forearms should move.",
   "Continue the movement until your biceps are fully contracted and the bar is at shoulder level. Hold the contracted position for a second and squeeze the biceps hard.",
   "Slowly begin to bring the bar back to starting position as your breathe in.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "beginner",
  "force": "pull",
  "mechanic": "isolation"
 },
 "db-curl": {
  "src": "Dumbbell_Bicep_Curl",
  "name": "Dumbbell Bicep Curl",
  "photos": 2,
  "steps": [
   "Stand up straight with a dumbbell in each hand at arm's length. Keep your elbows close to your torso and rotate the palms of your hands until they are facing forward. This will be your starting position.",
   "Now, keeping the upper arms stationary, exhale and curl the weights while contracting your biceps. Continue to raise the weights until your biceps are fully contracted and the dumbbells are at shoulder level. Hold the contracted position for a brief pause as you squeeze your biceps.",
   "Then, inhale and slowly begin to lower the dumbbells back to the starting position.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "beginner",
  "force": "pull",
  "mechanic": "isolation"
 },
 "hammer-curl": {
  "src": "Hammer_Curls",
  "name": "Hammer Curls",
  "photos": 2,
  "steps": [
   "Stand up with your torso upright and a dumbbell on each hand being held at arms length. The elbows should be close to the torso.",
   "The palms of the hands should be facing your torso. This will be your starting position.",
   "Now, while holding your upper arm stationary, exhale and curl the weight forward while contracting the biceps. Continue to raise the weight until the biceps are fully contracted and the dumbbell is at shoulder level. Hold the contracted position for a brief moment as you squeeze the biceps. Tip: Focus on keeping the elbow stationary and only moving your forearm.",
   "After the brief pause, inhale and slowly begin the lower the dumbbells back down to the starting position.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "beginner",
  "force": "pull",
  "mechanic": "isolation"
 },
 "preacher-curl": {
  "src": "Preacher_Curl",
  "name": "Preacher Curl",
  "photos": 2,
  "steps": [
   "To perform this movement you will need a preacher bench and an E-Z bar. Grab the E-Z curl bar at the close inner handle (either have someone hand you the bar which is preferable or grab the bar from the front bar rest provided by most preacher benches). The palm of your hands should be facing forward and they should be slightly tilted inwards due to the shape of the bar.",
   "With the upper arms positioned against the preacher bench pad and the chest against it, hold the E-Z Curl Bar at shoulder length. This will be your starting position.",
   "As you breathe in, slowly lower the bar until your upper arm is extended and the biceps is fully stretched.",
   "As you exhale, use the biceps to curl the weight up until your biceps is fully contracted and the bar is at shoulder height. Squeeze the biceps hard and hold this position for a second.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "beginner",
  "force": "pull",
  "mechanic": "isolation"
 },
 "cable-curl": {
  "src": "Standing_Biceps_Cable_Curl",
  "name": "Standing Biceps Cable Curl",
  "photos": 2,
  "steps": [
   "Stand up with your torso upright while holding a cable curl bar that is attached to a low pulley. Grab the cable bar at shoulder width and keep the elbows close to the torso. The palm of your hands should be facing up (supinated grip). This will be your starting position.",
   "While holding the upper arms stationary, curl the weights while contracting the biceps as you breathe out. Only the forearms should move. Continue the movement until your biceps are fully contracted and the bar is at shoulder level. Hold the contracted position for a second as you squeeze the muscle.",
   "Slowly begin to bring the curl bar back to starting position as your breathe in.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "beginner",
  "force": "pull",
  "mechanic": "isolation"
 },
 "pushdown": {
  "src": "Triceps_Pushdown",
  "name": "Triceps Pushdown",
  "photos": 2,
  "steps": [
   "Attach a straight or angled bar to a high pulley and grab with an overhand grip (palms facing down) at shoulder width.",
   "Standing upright with the torso straight and a very small inclination forward, bring the upper arms close to your body and perpendicular to the floor. The forearms should be pointing up towards the pulley as they hold the bar. This is your starting position.",
   "Using the triceps, bring the bar down until it touches the front of your thighs and the arms are fully extended perpendicular to the floor. The upper arms should always remain stationary next to your torso and only the forearms should move. Exhale as you perform this movement.",
   "After a second hold at the contracted position, bring the bar slowly up to the starting point. Breathe in as you perform this step.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "beginner",
  "force": "push",
  "mechanic": "isolation"
 },
 "oh-ext": {
  "src": "Cable_Rope_Overhead_Triceps_Extension",
  "name": "Cable Rope Overhead Triceps Extension",
  "photos": 2,
  "steps": [
   "Attach a rope to the bottom pulley of the pulley machine.",
   "Grasping the rope with both hands, extend your arms with your hands directly above your head using a neutral grip (palms facing each other). Your elbows should be in close to your head and the arms should be perpendicular to the floor with the knuckles aimed at the ceiling. This will be your starting position.",
   "Slowly lower the rope behind your head as you hold the upper arms stationary. Inhale as you perform this movement and pause when your triceps are fully stretched.",
   "Return to the starting position by flexing your triceps as you breathe out.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "beginner",
  "force": "push",
  "mechanic": "isolation"
 },
 "skullcrusher": {
  "src": "EZ-Bar_Skullcrusher",
  "name": "EZ-Bar Skullcrusher",
  "photos": 2,
  "steps": [
   "Using a close grip, lift the EZ bar and hold it with your elbows in as you lie on the bench. Your arms should be perpendicular to the floor. This will be your starting position.",
   "Keeping the upper arms stationary, lower the bar by allowing the elbows to flex. Inhale as you perform this portion of the movement. Pause once the bar is directly above the forehead.",
   "Lift the bar back to the starting position by extending the elbow and exhaling.",
   "Repeat."
  ],
  "level": "beginner",
  "force": "push",
  "mechanic": "isolation"
 },
 "cgbp": {
  "src": "Close-Grip_Barbell_Bench_Press",
  "name": "Close-Grip Barbell Bench Press",
  "photos": 2,
  "steps": [
   "Lie back on a flat bench. Using a close grip (around shoulder width), lift the bar from the rack and hold it straight over you with your arms locked. This will be your starting position.",
   "As you breathe in, come down slowly until you feel the bar on your middle chest. Tip: Make sure that - as opposed to a regular bench press - you keep the elbows close to the torso at all times in order to maximize triceps involvement.",
   "After a second pause, bring the bar back to the starting position as you breathe out and push the bar using your triceps muscles. Lock your arms in the contracted position, hold for a second and then start coming down slowly again. Tip: It should take at least twice as long to go down than to come up.",
   "Repeat the movement for the prescribed amount of repetitions.",
   "When you are done, place the bar back in the rack."
  ],
  "level": "beginner",
  "force": "push",
  "mechanic": "compound"
 },
 "squat": {
  "src": "Barbell_Full_Squat",
  "name": "Barbell Full Squat",
  "photos": 2,
  "steps": [
   "This exercise is best performed inside a squat rack for safety purposes. To begin, first set the bar on a rack just above shoulder level. Once the correct height is chosen and the bar is loaded, step under the bar and place the back of your shoulders (slightly below the neck) across it.",
   "Hold on to the bar using both arms at each side and lift it off the rack by first pushing with your legs and at the same time straightening your torso.",
   "Step away from the rack and position your legs using a shoulder-width medium stance with the toes slightly pointed out. Keep your head up at all times and maintain a straight back. This will be your starting position.",
   "Begin to slowly lower the bar by bending the knees and sitting back with your hips as you maintain a straight posture with the head up. Continue down until your hamstrings are on your calves. Inhale as you perform this portion of the movement.",
   "Begin to raise the bar as you exhale by pushing the floor with the heel or middle of your foot as you straighten the legs and extend the hips to go back to the starting position.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "intermediate",
  "force": "push",
  "mechanic": "compound"
 },
 "front-squat": {
  "src": "Front_Barbell_Squat",
  "name": "Front Barbell Squat",
  "photos": 2,
  "steps": [
   "This exercise is best performed inside a squat rack for safety purposes. To begin, first set the bar on a rack that best matches your height. Once the correct height is chosen and the bar is loaded, bring your arms up under the bar while keeping the elbows high and the upper arm slightly above parallel to the floor. Rest the bar on top of the deltoids and cross your arms while grasping the bar for total control.",
   "Lift the bar off the rack by first pushing with your legs and at the same time straightening your torso.",
   "Step away from the rack and position your legs using a shoulder width medium stance with the toes slightly pointed out. Keep your head up at all times as looking down will get you off balance and also maintain a straight back. This will be your starting position. (Note: For the purposes of this discussion we will use the medium stance described above which targets overall development; however you can choose any of the three stances described in the foot positioning section).",
   "Begin to slowly lower the bar by bending the knees as you maintain a straight posture with the head up. Continue down until the angle between the upper leg and the calves becomes slightly less than 90-degrees (which is the point in which the upper legs are below parallel to the floor). Inhale as you perform this portion of the movement. Tip: If you performed the exercise correctly, the front of the knees should make an imaginary straight line with the toes that is perpendicular to the front. If your knees are past that imaginary line (if they are past your toes) then you are placing undue stress on the knee and the exercise has been performed incorrectly.",
   "Begin to raise the bar as you exhale by pushing the floor mainly with the middle of your foot as you straighten the legs again and go back to the starting position.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "expert",
  "force": "push",
  "mechanic": "compound"
 },
 "leg-press": {
  "src": "Leg_Press",
  "name": "Leg Press",
  "photos": 2,
  "steps": [
   "Using a leg press machine, sit down on the machine and place your legs on the platform directly in front of you at a medium (shoulder width) foot stance. (Note: For the purposes of this discussion we will use the medium stance described above which targets overall development; however you can choose any of the three stances described in the foot positioning section).",
   "Lower the safety bars holding the weighted platform in place and press the platform all the way up until your legs are fully extended in front of you. Tip: Make sure that you do not lock your knees. Your torso and the legs should make a perfect 90-degree angle. This will be your starting position.",
   "As you inhale, slowly lower the platform until your upper and lower legs make a 90-degree angle.",
   "Pushing mainly with the heels of your feet and using the quadriceps go back to the starting position as you exhale.",
   "Repeat for the recommended amount of repetitions and ensure to lock the safety pins properly once you are done. You do not want that platform falling on you fully loaded."
  ],
  "level": "beginner",
  "force": "push",
  "mechanic": "compound"
 },
 "hack-squat": {
  "src": "Hack_Squat",
  "name": "Hack Squat",
  "photos": 2,
  "steps": [
   "Place the back of your torso against the back pad of the machine and hook your shoulders under the shoulder pads provided.",
   "Position your legs in the platform using a shoulder width medium stance with the toes slightly pointed out. Tip: Keep your head up at all times and also maintain the back on the pad at all times.",
   "Place your arms on the side handles of the machine and disengage the safety bars (which on most designs is done by moving the side handles from a facing front position to a diagonal position).",
   "Now straighten your legs without locking the knees. This will be your starting position. (Note: For the purposes of this discussion we will use the medium stance described above which targets overall development; however you can choose any of the three stances described in the foot positioning section).",
   "Begin to slowly lower the unit by bending the knees as you maintain a straight posture with the head up (back on the pad at all times). Continue down until the angle between the upper leg and the calves becomes slightly less than 90-degrees (which is the point in which the upper legs are below parallel to the floor). Inhale as you perform this portion of the movement. Tip: If you performed the exercise correctly, the front of the knees should make an imaginary straight line with the toes that is perpendicular to the front. If your knees are past that imaginary line (if they are past your toes) then you are placing undue stress on the knee and the exercise has been performed incorrectly.",
   "Begin to raise the unit as you exhale by pushing the floor with mainly with the heel of your foot as you straighten the legs again and go back to the starting position.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "beginner",
  "force": "push",
  "mechanic": "compound"
 },
 "bulgarian": {
  "src": "Split_Squat_with_Dumbbells",
  "name": "Split Squat with Dumbbells",
  "photos": 2,
  "steps": [
   "Position yourself into a staggered stance with the rear foot elevated and front foot forward.",
   "Hold a dumbbell in each hand, letting them hang at the sides. This will be your starting position.",
   "Begin by descending, flexing your knee and hip to lower your body down. Maintain good posture througout the movement. Keep the front knee in line with the foot as you perform the exercise.",
   "At the bottom of the movement, drive through the heel to extend the knee and hip to return to the starting position."
  ],
  "level": "beginner",
  "force": "push",
  "mechanic": "compound"
 },
 "lunge": {
  "src": "Dumbbell_Lunges",
  "name": "Dumbbell Lunges",
  "photos": 2,
  "steps": [
   "Stand with your torso upright holding two dumbbells in your hands by your sides. This will be your starting position.",
   "Step forward with your right leg around 2 feet or so from the foot being left stationary behind and lower your upper body down, while keeping the torso upright and maintaining balance. Inhale as you go down. Note: As in the other exercises, do not allow your knee to go forward beyond your toes as you come down, as this will put undue stress on the knee joint. Make sure that you keep your front shin perpendicular to the ground.",
   "Using mainly the heel of your foot, push up and go back to the starting position as you exhale.",
   "Repeat the movement for the recommended amount of repetitions and then perform with the left leg."
  ],
  "level": "beginner",
  "force": "push",
  "mechanic": "compound"
 },
 "leg-ext": {
  "src": "Leg_Extensions",
  "name": "Leg Extensions",
  "photos": 2,
  "steps": [
   "For this exercise you will need to use a leg extension machine. First choose your weight and sit on the machine with your legs under the pad (feet pointed forward) and the hands holding the side bars. This will be your starting position. Tip: You will need to adjust the pad so that it falls on top of your lower leg (just above your feet). Also, make sure that your legs form a 90-degree angle between the lower and upper leg. If the angle is less than 90-degrees then that means the knee is over the toes which in turn creates undue stress at the knee joint. If the machine is designed that way, either look for another machine or just make sure that when you start executing the exercise you stop going down once you hit the 90-degree angle.",
   "Using your quadriceps, extend your legs to the maximum as you exhale. Ensure that the rest of the body remains stationary on the seat. Pause a second on the contracted position.",
   "Slowly lower the weight back to the original position as you inhale, ensuring that you do not go past the 90-degree angle limit.",
   "Repeat for the recommended amount of times."
  ],
  "level": "beginner",
  "force": "push",
  "mechanic": "isolation"
 },
 "rdl": {
  "src": "Romanian_Deadlift",
  "name": "Romanian Deadlift",
  "photos": 2,
  "steps": [
   "Put a barbell in front of you on the ground and grab it using a pronated (palms facing down) grip that a little wider than shoulder width. Tip: Depending on the weight used, you may need wrist wraps to perform the exercise and also a raised platform in order to allow for better range of motion.",
   "Bend the knees slightly and keep the shins vertical, hips back and back straight. This will be your starting position.",
   "Keeping your back and arms completely straight at all times, use your hips to lift the bar as you exhale. Tip: The movement should not be fast but steady and under control.",
   "Once you are standing completely straight up, lower the bar by pushing the hips back, only slightly bending the knees, unlike when squatting. Tip: Take a deep breath at the start of the movement and keep your chest up. Hold your breath as you lower and exhale as you complete the movement.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "intermediate",
  "force": "pull",
  "mechanic": "compound"
 },
 "leg-curl": {
  "src": "Lying_Leg_Curls",
  "name": "Lying Leg Curls",
  "photos": 2,
  "steps": [
   "Adjust the machine lever to fit your height and lie face down on the leg curl machine with the pad of the lever on the back of your legs (just a few inches under the calves). Tip: Preferably use a leg curl machine that is angled as opposed to flat since an angled position is more favorable for hamstrings recruitment.",
   "Keeping the torso flat on the bench, ensure your legs are fully stretched and grab the side handles of the machine. Position your toes straight (or you can also use any of the other two stances described on the foot positioning section). This will be your starting position.",
   "As you exhale, curl your legs up as far as possible without lifting the upper legs from the pad. Once you hit the fully contracted position, hold it for a second.",
   "As you inhale, bring the legs back to the initial position. Repeat for the recommended amount of repetitions."
  ],
  "level": "beginner",
  "force": "pull",
  "mechanic": "isolation"
 },
 "seated-curl": {
  "src": "Seated_Leg_Curl",
  "name": "Seated Leg Curl",
  "photos": 2,
  "steps": [
   "Adjust the machine lever to fit your height and sit on the machine with your back against the back support pad.",
   "Place the back of lower leg on top of padded lever (just a few inches under the calves) and secure the lap pad against your thighs, just above the knees. Then grasp the side handles on the machine as you point your toes straight (or you can also use any of the other two stances) and ensure that the legs are fully straight right in front of you. This will be your starting position.",
   "As you exhale, pull the machine lever as far as possible to the back of your thighs by flexing at the knees. Keep your torso stationary at all times. Hold the contracted position for a second.",
   "Slowly return to the starting position as you breathe in.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "beginner",
  "force": "pull",
  "mechanic": "isolation"
 },
 "hip-thrust": {
  "src": "Barbell_Hip_Thrust",
  "name": "Barbell Hip Thrust",
  "photos": 2,
  "steps": [
   "Begin seated on the ground with a bench directly behind you. Have a loaded barbell over your legs. Using a fat bar or having a pad on the bar can greatly reduce the discomfort caused by this exercise.",
   "Roll the bar so that it is directly above your hips, and lean back against the bench so that your shoulder blades are near the top of it.",
   "Begin the movement by driving through your feet, extending your hips vertically through the bar. Your weight should be supported by your shoulder blades and your feet. Extend as far as possible, then reverse the motion to return to the starting position."
  ],
  "level": "intermediate",
  "force": "push",
  "mechanic": "compound"
 },
 "calf-raise": {
  "src": "Standing_Calf_Raises",
  "name": "Standing Calf Raises",
  "photos": 2,
  "steps": [
   "Adjust the padded lever of the calf raise machine to fit your height.",
   "Place your shoulders under the pads provided and position your toes facing forward (or using any of the two other positions described at the beginning of the chapter). The balls of your feet should be secured on top of the calf block with the heels extending off it. Push the lever up by extending your hips and knees until your torso is standing erect. The knees should be kept with a slight bend; never locked. Toes should be facing forward, outwards or inwards as described at the beginning of the chapter. This will be your starting position.",
   "Raise your heels as you breathe out by extending your ankles as high as possible and flexing your calf. Ensure that the knee is kept stationary at all times. There should be no bending at any time. Hold the contracted position by a second before you start to go back down.",
   "Go back slowly to the starting position as you breathe in by lowering your heels as you bend the ankles until calves are stretched.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "beginner",
  "force": "push",
  "mechanic": "isolation"
 },
 "seated-calf": {
  "src": "Seated_Calf_Raise",
  "name": "Seated Calf Raise",
  "photos": 2,
  "steps": [
   "Sit on the machine and place your toes on the lower portion of the platform provided with the heels extending off. Choose the toe positioning of your choice (forward, in, or out) as per the beginning of this chapter.",
   "Place your lower thighs under the lever pad, which will need to be adjusted according to the height of your thighs. Now place your hands on top of the lever pad in order to prevent it from slipping forward.",
   "Lift the lever slightly by pushing your heels up and release the safety bar. This will be your starting position.",
   "Slowly lower your heels by bending at the ankles until the calves are fully stretched. Inhale as you perform this movement.",
   "Raise the heels by extending the ankles as high as possible as you contract the calves and breathe out. Hold the top contraction for a second.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "beginner",
  "force": "push",
  "mechanic": "isolation"
 },
 "plank": {
  "src": "Plank",
  "name": "Plank",
  "photos": 2,
  "steps": [
   "Get into a prone position on the floor, supporting your weight on your toes and your forearms. Your arms are bent and directly below the shoulder.",
   "Keep your body straight at all times, and hold this position as long as possible. To increase difficulty, an arm or leg can be raised."
  ],
  "level": "beginner",
  "force": "static",
  "mechanic": "isolation"
 },
 "hanging-raise": {
  "src": "Hanging_Leg_Raise",
  "name": "Hanging Leg Raise",
  "photos": 2,
  "steps": [
   "Hang from a chin-up bar with both arms extended at arms length in top of you using either a wide grip or a medium grip. The legs should be straight down with the pelvis rolled slightly backwards. This will be your starting position.",
   "Raise your legs until the torso makes a 90-degree angle with the legs. Exhale as you perform this movement and hold the contraction for a second or so.",
   "Go back slowly to the starting position as you breathe in.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "expert",
  "force": "pull",
  "mechanic": "isolation"
 },
 "cable-crunch": {
  "src": "Cable_Crunch",
  "name": "Cable Crunch",
  "photos": 2,
  "steps": [
   "Kneel below a high pulley that contains a rope attachment.",
   "Grasp cable rope attachment and lower the rope until your hands are placed next to your face.",
   "Flex your hips slightly and allow the weight to hyperextend the lower back. This will be your starting position.",
   "With the hips stationary, flex the waist as you contract the abs so that the elbows travel towards the middle of the thighs. Exhale as you perform this portion of the movement and hold the contraction for a second.",
   "Slowly return to the starting position as you inhale. Tip: Make sure that you keep constant tension on the abs throughout the movement. Also, do not choose a weight so heavy that the lower back handles the brunt of the work.",
   "Repeat for the recommended amount of repetitions."
  ],
  "level": "beginner",
  "force": "pull",
  "mechanic": "isolation"
 },
 "ab-wheel": {
  "src": "Ab_Roller",
  "name": "Ab Roller",
  "photos": 2,
  "steps": [
   "Hold the Ab Roller with both hands and kneel on the floor.",
   "Now place the ab roller on the floor in front of you so that you are on all your hands and knees (as in a kneeling push up position). This will be your starting position.",
   "Slowly roll the ab roller straight forward, stretching your body into a straight position. Tip: Go down as far as you can without touching the floor with your body. Breathe in during this portion of the movement.",
   "After a pause at the stretched position, start pulling yourself back to the starting position as you breathe out. Tip: Go slowly and keep your abs tight at all times."
  ],
  "level": "intermediate",
  "force": "pull",
  "mechanic": "compound"
 },
 "run": {
  "src": "Running_Treadmill",
  "name": "Running, Treadmill",
  "photos": 2,
  "steps": [
   "To begin, step onto the treadmill and select the desired option from the menu. Most treadmills have a manual setting, or you can select a program to run. Typically, you can enter your age and weight to estimate the amount of calories burned during exercise. Elevation can be adjusted to change the intensity of the workout.",
   "Treadmills offer convenience, cardiovascular benefits, and usually have less impact than running outside. A 150 lb person will burn over 450 calories running 8 miles per hour for 30 minutes. Maintain proper posture as you run, and only hold onto the handles when necessary, such as when dismounting or checking your heart rate."
  ],
  "level": "beginner",
  "force": null,
  "mechanic": null
 },
 "bike": {
  "src": "Bicycling_Stationary",
  "name": "Bicycling, Stationary",
  "photos": 2,
  "steps": [
   "To begin, seat yourself on the bike and adjust the seat to your height.",
   "Select the desired option from the menu. You may have to start pedaling to turn it on. You can use the manual setting, or you can select a program to use. Typically, you can enter your age and weight to estimate the amount of calories burned during exercise. The level of resistance can be changed throughout the workout. The handles can be used to monitor your heart rate to help you stay at an appropriate intensity."
  ],
  "level": "beginner",
  "force": null,
  "mechanic": null
 },
 "incline-walk": {
  "src": "Walking_Treadmill",
  "name": "Walking, Treadmill",
  "photos": 2,
  "steps": [
   "To begin, step onto the treadmill and select the desired option from the menu. Most treadmills have a manual setting, or you can select a program to run. Typically, you can enter your age and weight to estimate the amount of calories burned during exercise. Elevation can be adjusted to change the intensity of the workout.",
   "Treadmills offer convenience, cardiovascular benefits, and usually have less impact than walking outside. When walking, you should move at a moderate to fast pace, not a leisurely one. Being an activity of lower intensity, walking doesn't burn as many calories as some other activities, but still provides great benefit. A 150 lb person will burn about 175 calories walking 4 miles per hour for 30 minutes, compared to 450 calories running twice as fast. Maintain proper posture as you walk, and only hold onto the handles when necessary, such as when dismounting or checking your heart rate."
  ],
  "level": "beginner",
  "force": null,
  "mechanic": null
 },
 "rower": {
  "src": "Rowing_Stationary",
  "name": "Rowing, Stationary",
  "photos": 2,
  "steps": [
   "To begin, seat yourself on the rower. Make sure that your heels are resting comfortably against the base of the foot pedals and that the straps are secured. Select the program that you wish to use, if applicable. Sit up straight and bend forward at the hips.",
   "There are three phases of movement when using a rower. The first phase is when you come forward on the rower. Your knees are bent and against your chest. Your upper body is leaning slightly forward while still maintaining good posture. Next, push against the foot pedals and extend your legs while bringing your hands to your upper abdominal area, squeezing your shoulders back as you do so. To avoid straining your back, use primarily your leg and hip muscles.",
   "The recovery phase simply involves straightening your arms, bending the knees, and bringing your body forward again as you transition back into the first phase."
  ],
  "level": "intermediate",
  "force": null,
  "mechanic": null
 },
 "stairmaster": {
  "src": "Stairmaster",
  "name": "Stairmaster",
  "photos": 2,
  "steps": [
   "To begin, step onto the stairmaster and select the desired option from the menu. You can choose a manual setting, or you can select a program to run. Typically, you can enter your age and weight to estimate the amount of calories burned during exercise.",
   "Pump your legs up and down in an established rhythm, driving the pedals down but not all the way to the floor. It is recommended that you maintain your grip on the handles so that you don't fall. The handles can be used to monitor your heart rate to help you stay at an appropriate intensity.",
   "Stairmasters offer convenience, cardiovascular benefits, and usually have less impact than running outside. They are typically much harder than other cardio equipment. A 150 lb person will typically burn over 300 calories in 30 minutes, compared to about 175 calories walking."
  ],
  "level": "intermediate",
  "force": null,
  "mechanic": null
 }
};
