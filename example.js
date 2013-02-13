var workout = require('./workout')
var desc = " Run 800 meters\n 135 pound deadlift, 30 reps\nRun 600 meters\n135 pound deadlift, 20 reps\nrun 400 meters\n135 pound deadlift, 10 reps"
console.log( JSON.stringify(workout(desc),null, 4) )