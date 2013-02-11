
var _ = require('underscore')
var inflection = require( 'inflection' );
var tasks = {}
var power_lift_movements = [ 
  'back squat'
  , 'bench press'
  , 'deadlift'
  , 'front squat'
  , 'knee snatch'
  , 'overhead squat'
  , 'power clean'
  , 'push press'
  , 'shoulder press'
  , 'sumo deadlift high pull'
]

var rm_match = require('./utils').rm_match

// matches variables of "Movement Name N-N-N-N-...N"
// var regexp = new RegExp( "(" + power_lift_movements.join('|') + ")\\s+(\\d(?:\\-\\d)+)","i")

tasks['double-under'] = function(task, round_reps){
  var m = task.match(/(\d+)*(?:\s)*double(?:\s)*(?:-)*(?:\s)*(?:unders|under)(?:\s)*/im)
  if(!m) return
  var obj = { type : 'double-under' }
  if(m[1]) obj.reps = Number(m[1])
  return obj
}

tasks['box jump'] = function(task, round_reps){
  if(!task.match(/box\s*jump(?:s)*/im)) return
  task = task.replace(/(\s*,\s*)/im,' ')
  var obj = { type : 'box jump' }
  task = get_distance(task, obj, 'height')
  m = task.match(/^(\d+)\s*box\s*jump(?:s)*/im)
  if(m) obj.reps = Number(m[1])
  task = get_reps(task, obj)
  return obj
}

// tasks['barbell run'] = function(task){
//   if(!task.match(/run/i) || !task.match(/barbell/i) || !task.match(/with/i)) return
//   var obj = { type : 'barbell run' }
//   task = get_distance(task, obj, null, true)
//   task = get_weight(task, obj, null, true)
//   return obj
// }

tasks['run'] = function(task, round_reps){
  // TODO
  // match forms: run 1 miles, run 100 meters, sprint 100 meters
  var m = task.match(/(run|sprint|row)/i)
  if(!m) return
  task = rm_match(task, m)
  var obj = { type : m[1].toLowerCase() }
  if(obj.type === 'sprint') obj.type = 'run'
  if(obj.type === 'run'){
    m = task.match(/backward(?:s)/i)
    if(m) obj.type = 'run backward'
    task = rm_match(task, m)
  }
  task = get_distance(task, obj)
  if(!obj.distance) return
  m = task.match(/with\s*a*/i)
  if(m){
    obj.distance = {
      value : obj.distance
      , units : obj.units
    }
    task = get_weight(task, obj, null, true)
    m = task.match(/with\s*a*\s*([a-z\s]+)/i)
    delete obj.units
    obj.type = 'run with ' + m[1]
    task = rm_match(task, m)
  }
  return obj
}

tasks['rest'] = function(task, round_reps){
  if(
    !task.match(/rest\s*(\d+)\s*(hours*|minutes*|seconds*)/i) 
    && !task.match(/(\d+)*\s*(hours*|minutes*|seconds*)\s*rest/i)
  ) return
  var obj = { type : 'rest' }
  task = get_duration(task, obj)
  return obj
}

// tasks['power lift'] = function(task, round_reps){
//   var reps
//   var m = task.match(/(\d+)\s*(?:reps|rep)\s*(?:of)*\s*(?:\:)*\s*/im)
//   if(m){
//     reps = Number(m[1])
//     task = rm_match(task,m)
//   }
//   m = task.match(/^(\d+)\s*(?:pounds|pound)\s*([a-z]+[a-z\s\-]*)/im)
//   if(!m) return
//   var obj = {
//     type : 'power lift'
//     , movement : m[2].toLowerCase().replace('-',' ')
//     , weight : Number(m[1])
//     , units : 'pounds'
//   }
//   if(reps) obj.reps = reps
//   task = get_arm(task, obj)
//   return obj
// }

tasks['pull up'] = function(task, round_reps){
  var m = task.match(/^(\d+)*\s*(weight(?:ed)*)*\s*pull\s*-*\s*ups*\s*/im)
  if(!m) return
  if(m[2]) weighted = 'weighted ' 
  else weighted = ''
  var obj = { type : weighted + 'pull-up' }
  if(weighted !== '') task = get_weight(task, obj)
  if(m[1]) obj.reps = Number(m[1])
  return obj
}

tasks['wallball shot'] = function(task, round_reps){
  // 24 Wallball shots, 20 pound ball
  var m = task.match(/^(\d+)*\s*wall\s*ball\s*-*\s*(?:shots|shot)\s*/im)
  if(!m) return
  var obj = { type: 'wallball shot' }
  if(m[1]) obj.reps = Number(m[1])
  task = rm_match(task,m)
  task = get_weight(task, obj, null, true)
  task = get_distance(task, obj, 'height', true)
  if(!obj.height){
    if(obj.weight){
      obj.units = obj.weight.units
      obj.weight = obj.weight.value
    }
  }else{
    if(!obj.weight){
      obj.units = obj.height.units
      obj.height = obj.height.value
    }
  }
  return obj
}

tasks['turkish get-up'] = function(task, round_reps, settings){
  var m = task.match(/(\d+)*\s*turkish\s*get\-up(?:s*)\s*,*/im)
  if(!m) return
  var obj = { type : 'turkish get-up' }
  if(m[1]) obj.reps = Number(m[1])
  var task = get_arm(task, obj)
  if(settings.kettlebell){
    if(settings.kettlebell.weight)
      obj.weight = settings.kettlebell.weight
    if(settings.kettlebell.units)
      obj.units = settings.kettlebell.units
  }
  return obj
}

tasks['kettlebell swing'] = function(task, round_reps, settings){
  var m = task.match(/(\d+)*\s*(?:kettlebell|kb)*\s*swing(?:s*)\s*/im)
  if(!m) return
  var obj = { type : 'kettlebell swing' }
  if(m[1]) obj.reps = Number(m[1])
  task = rm_match(task,m)
  if(settings.kettlebell){
    if(settings.kettlebell.weight)
      obj.weight = settings.kettlebell.weight
    if(settings.kettlebell.units)
      obj.units = settings.kettlebell.units
  }else task = get_weight(task, obj)
  return obj
}

tasks['kettlebell overhead squat'] = function(task, round_reps, settings){
  var m = task.match(/(\d+)*\s*overhead\s*squat(?:s)*\s*,*\s*(?:(left|right)\s*arm)/im)
  if(!m) return
  var obj = { type : 'kettlebell overhead squat' }
  if(m[1]) obj.reps = Number(m[1])
  if(m[2]) obj.arm = m[2].toLowerCase()
  if(settings.kettlebell){
    if(settings.kettlebell.weight)
      obj.weight = settings.kettlebell.weight
    if(settings.kettlebell.units)
      obj.units = settings.kettlebell.units
  }
  return obj
}

tasks['walking lunge'] = function(task, round_reps, settings){
  var m = task.match(/(\d+)*\s*walking\s*lunge(?:s)*/i);
  if(!m) return
  task = rm_match(task,m)
  var obj = { type : 'walking lunge' }
  if(m[1]) obj.reps = Number(m[1])
  task = get_weight(task, obj, null, true)
  task = get_distance(task, obj, null, true)
  if(obj.distance){
    if(!obj.weight){
      obj.units = obj.distance.units
      obj.distance = obj.distance.value
    }
  }else{
    if(obj.weight){
      obj.units = obj.weight.units
      obj.weight = obj.weight.value
    }
  }
  return obj
}

tasks['handstand push-up'] = function(task, round_reps, settings){
  var m = task.match(/^(\d+)*\s*hand\s*stand\s*push\s*-\s*up(?:s)*\s*$/im)
  if(!m) return
  var obj = { type : 'handstand push-up' }
  if(m[1]) obj.reps = Number(m[1])
  return obj
}

tasks['rope climb'] = function(task){
  var m = task.match(/rope\s*climb/im)
  if(!m) return
  task = rm_match(task, m)
  var obj = { 'type' : 'rope climb' }
  task = get_reps(task, obj)
  task = get_distance(task, obj, 'height')
  return obj
}

tasks['sandbag carry'] = function(task){
  if(!task.match(/sand\s*bag/i) && !task.match(/carry/i)) return
  var obj = { type : 'sandbag carry' }
  task = get_distance(task, obj, null, true)
  task = get_weight(task, obj, null, true)
  return obj
}

function get_distance(task, obj, prop, contain){
  if(!prop) prop = 'distance'
  var m = task.match(/\s*(\d+)\s*('|feet|foot|meters*|miles*|m|k|"|inch|in(?=\s)|steps*)/im)
  if(!m) return task
  if(contain){
    if(!obj[prop]) obj[prop] = {}
    obj = obj[prop]
    prop = 'value'
  }
  obj[prop] = Number(m[1])
  var unit = m[2]
  if(unit.match(/^('|feet|foot)$/im)) obj.units = 'feet'
  else if(unit.match(/^(meters|meter|m)$/im)) obj.units = 'meters'
  else if(unit.match(/^(mile|miles)$/im)) obj.units = 'miles'
  else if(unit.match(/^("|inch|in)$/im)) obj.units = 'inches'
  else if(unit.match(/^(steps|step)$/im)) obj.units = 'steps'
  else if(unit.match(/^(k)$/im)) obj.units = 'kilometers'
  task = rm_match(task,m)
  return task
}

function get_duration(task, obj, prop, contain){
  if(!prop) prop = 'duration'
  var m = task.match(/\s*(\d+)\s*(hours*|minutes*|seconds*)/im)
  if(!m) return task
  if(contain){
    if(!obj[prop]) obj[prop] = {}
    obj = obj[prop]
    prop = 'value'
  }
  obj[prop] = Number(m[1])
  var unit = m[2]
  if(unit.match(/^hours*/im)) obj.units = 'hours'
  else if(unit.match(/^minutes*/im)) obj.units = 'minutes'
  else if(unit.match(/^seconds*/im)) obj.units = 'seconds'
  task = rm_match(task, m)
  return task
}

function get_weight(task, obj, prop, contain){
  if(!prop) prop = 'weight'
  var m = task.match(/\s*(\d+)(\.(?:\d+))*\s*(pounds*|lbs*|pood)\s*(?:each)*/im)
  if(!m) return task
  if(contain){
    if(!obj[prop]) obj[prop] = {}
    obj = obj[prop]
    prop = 'value'
  }
  obj[prop] = Number(m[1])
  if(m[2]) obj[prop] += Number(m[2])
  if(m[3].match(/(?:pounds*|lb)/i)) obj.units = 'pounds'
  else if(m[3].match(/poods*/i)) obj.units = 'pood'
  return rm_match(task, m)
}

function get_reps(task, obj){
  var m = task.match(/\s*(\d+)\s*(rep|ascent)(?:s)*/im);
  if(!m) return task
  obj.reps = Number(m[1])
  return rm_match(task,m)
}

function get_arm(task, obj){
  var m = task.match(/\s*(?:(left|right)\s*arm)/i)
  if(!m) return task
  obj.arm = m[1].toLowerCase()
  return rm_match(task, m)
}

tasks['distance catch all'] = function(task, round_reps){
  var obj = {}
  task = get_distance(task, obj)
  var catch_all = tasks['catch all'](task, round_reps)
  if(catch_all) return _.extend(obj,catch_all)
}

tasks['catch all'] = function(task, round_reps){
  var obj = {}
  console.log('catch all')
  task = get_weight(task, obj)
  var m = task.match(/^(\d+)*\s*([a-z]+[a-z\s\-]*)+/im)
  console.log(m)
  if(!m) return
  if(m[1]){
    obj.reps = Number(m[1])
    task = task.substring(m[1].length + 1)
  }
  else task = get_reps(task,obj)
  if(!obj.reps && !round_reps) return
  task = get_arm(task, obj)
  
  //if(type[type.length-1] === 's') type = type.substring(0,type.length-1)
  task = task.replace(/pull\s*\-*\s*ups*/i,'pull-up')
        .replace(/sit\s*\-*\s*ups*/i,'sit-up')
        .replace(/push\s*\-*\s*ups*/i,'push-up').trim()
        .replace(/(\.|,)/ig,'')
  
  var type = task.split(/(?:\s)/)
  if(type[type.length-1]) type[type.length-1] = inflection.singularize(type[type.length-1])
  type = type.join(' ').toLowerCase()
  
  obj.type = type
  return obj
}

module.exports = tasks;