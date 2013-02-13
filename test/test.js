

var training = require('./wod.descriptions.json')
var _ = require('underscore')
var workout = require('./../workout')
var expected = require('./wod.expected.json')
var assert = require('assert')

// regexp for 'X rounds for time' : /(\d+|zero|one|two|three|four|five|size|seven|eight|nine|ten|eleven|twelve) round(?:s|) for time/i

describe('workout.js', function(){
  _.each(training, function(desc, key){
    describe('workout: ' + key, function(){
      it('should parse to the expected workoutjs object', function(){
        var wod = workout(desc)
        if(!_.isEqual(wod, expected[key])){
          console.log('----WORKOUT: ' + key)
          console.log('expected workout does not match parsed workout')
          console.log('----------workout---------')
          console.log( require('util').inspect( wod, false, 10) )
          if(expected[key]){
            console.log('---------expected---------')
            console.log( require('util').inspect(expected[key], false, 10) )
            console.log('for wod description')
          }
          console.log('---json---')
          console.log('"' + key + '":' + JSON.stringify(wod))
          console.log('---description---')
          console.log(desc)
          throw new Error('workout did not parse')
        }
      })
    })
  })
})

if(_.any(training, function(desc, key){
  var wod = workout(desc)
  if(!_.isEqual(wod, expected[key])){
    console.log('----WORKOUT: ' + key)
    console.log('expected workout does not match parsed workout')
    console.log('----------workout---------')
    console.log( require('util').inspect( wod, false, 10) )
    if(expected[key]){
      console.log('---------expected---------')
      console.log( require('util').inspect(expected[key], false, 10) )
      console.log('for wod description')
    }else{
      console.log('---json---')
      console.log('"' + key + '":' + JSON.stringify(wod))
    }
    console.log(desc)
    return true
  }
})){
  console.log('test failed')
}else{
  console.log('test passed!')
}