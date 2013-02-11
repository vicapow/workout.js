

var training = require('./wod.descriptions.json')
var _ = require('underscore')
var wod = require('./wod')
var expected = require('./wod.expected.json')

// regexp for 'X rounds for time' : /(\d+|zero|one|two|three|four|five|size|seven|eight|nine|ten|eleven|twelve) round(?:s|) for time/i


if(_.any(training, function(desc, key){
  var workout = wod(desc)
  if(!_.isEqual(workout, expected[key])){
    console.log('----WOD: ' + key)
    console.log('expected workout does not match parsed workout')
    console.log('----------workout---------')
    console.log(require('util').inspect(workout,false,10))
    if(expected[key]){
      console.log('---------expected---------')
      console.log(require('util').inspect(expected[key],false,10))
      console.log('for wod description')
    }else{
      console.log('---json---')
      console.log('"' + key + '":' + JSON.stringify(workout))
    }
    console.log(desc)
    return true
  }
})){
  console.log('test failed')
}else{
  console.log('test passed!')
}