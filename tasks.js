
var _ = require('underscore')
var inflection = require( 'inflection' );
var tasks = {}
var lifts = [ 
  'back squat'
  , 'sumo deadlift high pull'
  , 'bench press'
  , 'stiff leg deadlift'
  , 'dumbbell burpee deadlift'
  , 'dumbbell deadlift'
  , 'deadlift'
  , 'front squat'
  , 'knee snatch'
  , 'kettlebell overhead squat'
  , 'overhead squat'
  , 'power clean'
  , 'hang power clean'
  , 'push press'
  , 'shoulder press'
  , 'power snatch'
]
var lifts_regexp = '(' + _.map(lifts, function(lift){
  return lift.replace(/ /g, '\\s*\\-*\\s*');
}).join('|') + ')'

var rm_match = require('./utils').rm_match

// matches variables of "Movement Name N-N-N-N-...N"
// var regexp = new RegExp( "(" + power_lift_movements.join('|') + ")\\s+(\\d(?:\\-\\d)+)","i")

tasks['double under'] = function(task, round_reps){
  var m = task.match(/(\d+)*(?:\s)*double(?:\s)*(?:-)*(?:\s)*(?:unders|under)(?:\s)*/im)
  if(!m) return
  var obj = { type : 'double under' }
  if(m[1]) obj.reps = Number(m[1])
  return obj
}

tasks['box jump'] = function(task, round_reps){
  if(!task.match(/box\s*jump(?:s)*/im)) return
  task = task.replace(/(\s*,\s*)/im,' ')
  var obj = { type : 'box jump' }
  task = get_distance(task, obj, 'height', true)
  m = task.match(/^(\d+)\s*box\s*jump(?:s)*/im)
  if(m) obj.reps = Number(m[1])
  task = get_reps(task, obj)
  m = task.match(/burpee/im)
  if(m) obj.type = 'burpee ' + obj.type
  task = rm_match(task, m)
  return obj
}

tasks['run'] = function(task, round_reps){
  // TODO
  // match forms: run 1 miles, run 100 meters, sprint 100 meters
  var m = task.match(/(run|sprint|row)/i)
  if(!m) return
  task = rm_match(task, m)
  var obj = { type : m[1].toLowerCase() }
  var backward = false
  var forward = false
  var shuttle = false
  if(obj.type === 'sprint') obj.type = 'run'
  // backwards run
  if(obj.type === 'run'){
    m = task.match(/shuttle/i)
    if(m){
      task = rm_match(task, m)
      obj.type = 'shuttle ' + obj.type
      shuttle = true
    }
    m = task.match(/backwards*/i)
    if(m) backward = true
    task = rm_match(task, m)
    if(backward){
      m = task.match(/forwards*/i)
      if(m) forward = true
      task = rm_match(task, m)
    }
    if(forward || backward){
      if(forward && backward) obj.direction = 'forward and backward'
      else obj.direction = forward ? 'forward' : '' + backward ? 'backward' : ''
    }
  }
  task = get_distance(task, obj, null, true)
  if(!obj.distance) return
  m = task.match(/with\s*a*/i)
  if(m){
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
  task = get_duration(task, obj, null, true)
  return obj
}

tasks['kettlebell overhead squat'] = function(task, round_reps, settings){
  var m = task.match(/(\d+)*\s*overhead\s*squat(?:s)*\s*,*\s*(?:(left|right)\s*arm)/im)
  if(!m) return
  var obj = { type : 'kettlebell overhead squat' }
  if(m[1]) obj.reps = Number(m[1])
  if(m[2]) obj.arm = m[2].toLowerCase()
  if(settings.kettlebell && settings.kettlebell.weight){
    obj.weight = {
      value : settings.kettlebell.weight
      , units : settings.kettlebell.units
    }
  }
  return obj
}

tasks['power lift'] = function(task, round_reps, settings){
  var r = new RegExp('(\\d+)*\\s*' + lifts_regexp, 'im')
  var m = task.match(r)
  if(!m) return
  task = rm_match(task, m)
  var obj = { type : m[2].toLowerCase() }
  if(m[1]) obj.reps = Number(m[1])
  else task = get_reps(task, obj)
  task = get_weight(task, obj, null, true)
  return obj
}

tasks['pull up'] = function(task, round_reps){
  var m = task.match(/^(\d+)*\s*(weight(?:ed)*)*\s*pull\s*-*\s*ups*\s*/im)
  if(!m) return
  var weighted = (m[2]) ? 'weighted ' : ''
  var obj = { type : weighted + 'pull up' }
  if(weighted !== '') task = get_weight(task, obj, null, true)
  if(m[1]) obj.reps = Number(m[1])
  return obj
}

tasks['push up'] = function(task, round_reps){
  var m = task.match(/^(\d+)*\s*(weight(?:ed)*)*\s*push\s*-*\s*ups*\s*/im)
  if(!m) return
  var weighted = (m[2]) ? 'weighted ' : ''
  var obj = { type : weighted + 'push up' }
  if(weighted !== '') task = get_weight(task, obj, null, true)
  if(m[1]) obj.reps = Number(m[1])
  m = task.match(/release\s*hands/i)
  task = rm_match(task, m)
  if(m) obj.type = 'hand release ' + obj.type
  return obj
}

tasks['wallball shot'] = function(task, round_reps){
  // 24 Wallball shots, 20 pound ball
  var m = task.match(/^(\d+)*\s*wall\s*ball\s*-*\s*(?:shots|shot)\s*/im)
  if(!m) return
  var obj = { type: 'wallball shot' }
  if(m[1]) obj.reps = Number(m[1])
  task = rm_match(task, m)
  task = get_weight(task, obj, null, true)
  task = get_distance(task, obj, 'height', true)
  return obj
}

tasks['turkish get up'] = function(task, round_reps, settings){
  var m = task.match(/(\d+)*\s*turkish\s*get\s*\-*ups*\s*,*/im)
  if(!m) return
  var obj = { type : 'turkish get up' }
  if(m[1]) obj.reps = Number(m[1])
  var task = get_arm(task, obj)
  if(settings.kettlebell && settings.kettlebell.weight){
    obj.weight = {
      value : settings.kettlebell.weight
      , units : settings.kettlebell.units
    }
  }
  return obj
}

tasks['kettlebell swing'] = function(task, round_reps, settings){
  var m = task.match(/(\d+)*\s*(kettle\s*bell|kb)*\s*swings*\s*/i)
  if(!m) return
  var obj = { type : 'kettlebell swing' }
  if(m[1]) obj.reps = Number(m[1])
  task = rm_match(task,m)
  if(settings.kettlebell && settings.kettlebell.weight){
    obj.weight = {
      value : settings.kettlebell.weight
      , units : settings.kettlebell.units
    }
  }else task = get_weight(task, obj, null, true)
  
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
  return obj
}

tasks['handstand push up'] = function(task, round_reps, settings){
  var m = task.match(/^(\d+)*\s*hand\s*stand\s*push\s*-\s*up(?:s)*\s*$/im)
  if(!m) return
  var obj = { type : 'handstand push up' }
  if(m[1]) obj.reps = Number(m[1])
  return obj
}

tasks['rope climb'] = function(task, round_reps, settings){
  var m = task.match(/rope\s*climb/im)
  if(!m) return
  task = rm_match(task, m)
  var obj = { 'type' : 'rope climb' }
  task = get_reps(task, obj)
  task = get_distance(task, obj, 'height', true)
  if(settings && settings.rope_climb && settings.rope_climb.from_floor){
    obj.type = obj.type + ' from floor'
  }
  return obj
}

tasks['sandbag carry'] = function(task){
  if(!task.match(/sand\s*bag/i) || !task.match(/carry/i)) return
  var obj = { type : 'sandbag carry' }
  task = get_distance(task, obj, null, true)
  task = get_weight(task, obj, null, true)
  return obj
}

tasks['ring lower'] = function(task, round_reps){
  var m = task.match(/ring/i) 
  if(!m) return
  task = rm_match(task, m)
  m = task.match(/lowers/i)
  if(!m) return
  task = rm_match(task, m)
  var obj = { type : 'ring lower' }
  m = task.match(/^\s*(\d+)/i)
  if(!m) obj.reps = round_reps
  else obj.reps = Number(m[1])
  task = rm_match(task, m)
  return obj
}

function get_distance(task, obj, prop, contain){
  if(!prop) prop = 'distance'
  task = task + ' '
  var m = task.match(/\s*(\d+)\s*(?:('|ft|feet|foot)|(miles*)|(meters*|m(?=\s))|(kilometers*|k(?=\s))|("|inch|in(?=\s))|(steps*)|(yards*))/im)
  if(!m) return task
  if(contain){
    if(!obj[prop]) obj[prop] = {}
    obj = obj[prop]
    prop = 'value'
  }
  obj[prop] = Number(m[1])
  if(m[2])      obj.units = 'feet'
  else if(m[3]) obj.units = 'miles'
  else if(m[4]) obj.units = 'meters'
  else if(m[5]) obj.units = 'kilometers'
  else if(m[6]) obj.units = 'inches'
  else if(m[7]) obj.units = 'steps'
  else if(m[8]) obj.units = 'yards'
  task = rm_match(task, m)
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
  var m = task.match(/\s*(\d+)(\.(?:\d+))*\s*\-*\s*(pounds*|lbs*|pood)\s*(?:each)*/im)
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
  var m = task.match(/\s*(\d+)*(max)*\s*(?:rep|ascent)s*/im);
  if(!m) return task
  if(m[1]) obj.reps = Number(m[1])
  else if(m[2]) obj.reps = 'max'
  else return
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
  task = get_distance(task, obj, null, true)
  var catch_all = tasks['catch all'](task, round_reps, obj)
  if(catch_all) return _.extend(obj,catch_all)
}

tasks['catch all'] = function(task, round_reps, obj){
  if(!obj) obj = {}
  task = get_weight(task, obj, null, true)
  var m = task.match(/^(\d+)*\s*([a-z]+[a-z\s\-]*)+/im)
  if(!m) return
  if(m[1]){
    obj.reps = Number(m[1])
    task = task.substring(m[1].length + 1)
  }
  else task = get_reps(task,obj)
  if(!obj.reps && !round_reps && !obj.distance) return
  task = get_arm(task, obj)
  
  task = task.replace(/\-/ig,' ').replace(/([^a-z0-9 ]+)/ig, '')
  var type = task.split(/(?:\s)/)
  type = type.join(' ').toLowerCase()
  
  type = type.trim()
  type = inflection.singularize(type)
  type = type.replace('push ups','push up')
  obj.type = type
  return obj
}

function clean_up(task){
  
  // consalidate metrics
  var keys = _.chain(task).pick(task, 'distance', 'weight', 'height', 'duration').keys().value()
  if( keys.length === 1){
    var key = keys[0]
    task.units = task[key].units
    task[key] = task[key].value
  }
  task.type = task.type.trim()
  return task
}

function transforms(task){
  var m = task.match(/stiff\s*leg(?:ged)*\s*deadlift/i)
  if(m) return fin("stiff leg deadlift")
  m = task.match(/barbells*\s*farmers*\s*carry/i)
  if(m) return fin('barbell farmer carry')
  m = task.match(/dumbbell\s*burpee*\s*dead\s*lifts*/i)
  if(m) return fin("dumbbell burpee deadlift")
  m = task.match(/ghd\s*sit\s*\-*\s*ups*/i)
  if(m) return fin("ghd sit up")
  return task
  
  function fin(label){
    task = rm_match(task, m)
    task = task.slice(0, m.index) + label + task.slice(m.index)
    return task
  }
}

module.exports = function(task, reps, settings){
  var parsed_task
  var duration = {}
  task = transforms(task)
  if(reps === 'max') task = get_duration(task, duration, null, true)
  if(_.any(tasks, function(task_parser){
    parsed_task = task_parser(task.replace(/\-/g,' '), reps, settings)
    if(!parsed_task) return
    else return _.extend(parsed_task, duration);
  })) return clean_up(parsed_task)
  else return {
    type : 'unknown'
    , desc : task
  }
};