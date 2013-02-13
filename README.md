# A standard format and parser for crossfit workouts

Here's an example of the crossfit workout [Abbate](http://www.crossfit.com/mt-archive2/007523.html) from Crossfit.com:

    Run 1 mile
    155 pound Clean and jerk, 21 reps
    Run 800 meters
    155 pound Clean and jerk, 21 reps
    Run 1 Mile

and the output of parsing the workout:

````javascript
"abbate": [{
  "type": "rounds for time",
  "rounds": 1,
  "tasks": [{
    "type": "run",
    "distance": 1,
    "units": "miles"
  }, {
    "type": "clean and jerk",
    "reps": 21,
    "weight": 155,
    "units": "pounds"
  }, {
    "type": "run",
    "distance": 800,
    "units": "meters"
  }, {
    "type": "clean and jerk",
    "reps": 21,
    "weight": 155,
    "units": "pounds"
  }, {
    "type": "run",
    "distance": 1,
    "units": "miles"
  }]
}]
````