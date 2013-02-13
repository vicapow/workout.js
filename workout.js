
var _ = require('underscore')
  , task_parser = require('./tasks')
  , rm_match = require('./utils').rm_match

module.exports = function(desc){
  var parts = desc.split(/\s+(?:then|followed by):?\s+/i)
  return _.map(parts, function(part){
    var lines = part.split('\n')
    if(!lines) return null
    // remove empty lines
    lines = _.filter(lines, function(line){ return (line!=='') && !line.match(/^(\s+)$/) })
    // remove empty whitespace padding
    lines = _.map(lines, function(line){ return line.match(/^(?:\s*)(.*?)(?:\s*)$/)[1] })
    part = lines.join('\n')
    
    var res = wod_settings(part)
    var settings = res.settings
    part = res.part
    
    res = tabata(part, settings)          // 20 seconds on, 10 seconds off of...
      || rounds(part, settings)
      || amrap(part, settings)            // as many rounds as possible for 10 minutes of...
      || reps_for_time(part, settings)    // 20-15-10 of: backsquat, double unders, etc...
      || rounds_for_reps(part, settings)  // 3 rounds for reps of deadlift, 1 minute, etc..
      || rounds('1 round for time of\n' + part, settings)
      || { 
        type : 'unknown'
        , desc : part
      }
    return clean_up(res, settings)
  })
}

function clean_up(workout, settings){
  var notes = []
  workout.tasks = _.filter(workout.tasks, function(task){
    if(task.type === 'unknown'){
      var m = task.desc.match(/partition\s*(.*)\s*as\s*needed\s*/i)
      if(m){
        notes.push(task.desc)
        return false
      }else return true
    }else return true
  })
  if(notes.length) workout.notes = notes
  if(settings.wear) workout.wear = settings.wear
  return workout
}

function wod_settings(part){
  var m = part.match(/(?:with|use)\s*a*\s*(?:single)*\s*(\d+)\s*pood(?:s)*\s*kettlebell\s*\:*/im)
  var settings = {}
  if(m){
    settings.kettlebell = {
      weight : Number(m[1])
      , units : 'pood'
    }
    part = rm_match(part, m)
  }
  m = part.match(/(?:if)*\s*(?:you\'ve|you\s*have)*\s*(?:got)*\s*(?:wear)*(?:ing)*\s*a*\s*([a-z0-9]+)*\s*(?:pound|lb)*\s*(?:weighted)*\s*vest\s*(?:or)*\s*(?:body)*\s*(?:armor)*\s*\,*\s(?:wear)*\s*(?:it)*\s*\.*/i)
  if(m){
    settings.wear = []
    var vest = { type : 'vest' }
    if(m[1]){
      vest.weight = to_num(m[1])
      vest.units = 'pounds'
    }
    settings.wear.push(vest)
    part = rm_match(part, m)
  }
  m = part.match(/begin\s*the\s*rope\s*climbs*\s*seated\s*on\s*the\s*floor\s*\.*/i)
  if(m){
    if(!settings.rope_climb) settings.rope_climb = {}
    settings.rope_climb.from_floor = true
    part = rm_match(part, m)
  }
  return {
    settings : settings
    , part : part
  }
}

function rounds_for_reps(part, settings){
  var m = part.match(/^\s*([a-z0-9]+)\s*rounds*\s*for\s*reps\s*(?:of)*\s*\:*\s*/im);
  if(!m) return
  var rounds = to_num(m[1])
  part = rm_match(part, m)
  var tasks = part.split(/(?:\n+)/)
  return {
    type : "rounds for reps"
    , rounds : rounds
    , tasks : parseTasks(tasks, 'max', settings)
  }
}

function reps_for_time(part, settings){
  var m = part.match(/^\s*((?:\d+)(?:-\d+)*)\s*(?:and\s*(\d+))*\s*reps*\s*(?:for)*\s*(time|form)*\s*(?:rounds)*\s*(?:of)*\s*\:*\s*/im)
  if(!m) return
  var reps = _.map(m[1].split('-'), Number)
  if(m[2]) reps.push(Number(m[2]))
  var reps_for = m[3] ? m[3].toLowerCase() : 'time'
  var tasks = rm_match(part, m)
  tasks = tasks.split(/(?:\n+)/)
  for(var i = 0; i < tasks.length; i++){
    var task = tasks[i]
    m = task.match(/\s*begin\s*each\s*round\s*with\s*a\s*(.*)/im)
    if(m){
      tasks.splice(i,1)
      tasks.unshift(m[1])
    }
  }
  
  return {
    type : "reps for " + reps_for
    , tasks : parseTasks(tasks, reps, settings)
    , reps : reps
  }
}

function to_num(str){
  var num = Number(str)
  if(!isNaN(num)) return num
  var nums = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty']
  nums = _.object(nums,_.range(0,nums.length))
  return nums[str.toLowerCase()]
}

function rounds(tasks, settings){
  // matches variations of "N Rounds for time"
  if(tasks.match(/^[^\n]*reps*/i)) return
  if(tasks.match(/^[^\n]*as\s*many\s*rounds*/i)) return
  if(tasks.match(/^[^\n]*max\s*rounds*/i)) return
  var m = tasks.match(/\s*(?:each)*\s*for\s*(time|form)\s*(?:of)*\s*\:*/i)
  var rounds_for, rounds, is = false
  if(m){
    rounds_for = m[1]
    tasks = rm_match(tasks, m)
    is = true
  }else rounds_for = 'time'
  m = tasks.match(/(?:complete)*\s*(?:([a-z0-9]+)*\s*rounds*)(?:[\s,]*)(?:of)*\:*/i)
  if(m){
    if(!m[1]) rounds = 1
    else rounds = to_num(m[1])
    is = true
    tasks = rm_match(tasks, m)
  }else rounds = 1
  if(!is) return
  return {
    type : 'rounds for ' + rounds_for.toLowerCase()
    , rounds : rounds
    , tasks : parseTasks(tasks, null, settings)
  }
}

function parseTasks(tasks, reps, settings){
  if(typeof tasks === 'string') tasks = tasks.split(/(?:\n+)/)
  // remove empty task strings
  tasks = _.filter(tasks, function(task){ return !task.match(/^(\s)*$/) })
  var matches = null
    , number = 0
    , distance_unit = null
    , task = null
    , ret_tasks = []
  
  return _.map(tasks,function(task){
    return task_parser(task, reps, settings)
  })
}

function amrap(part, settings){
  var m = part.match(/^\s*(\d+)\s*(?:min|minutes|minute)?\s*AMRAP\s*:?\s*/i)
  var task, minutes, repeat, between_rounds = []
  if(m){
    minutes = Number(m[1])
    tasks = rm_match(part,m)
  }else{
    m = part.match(/^\s*complete*\s*as\s*many\s*rounds\s*(?:as)*\s*(?:possible)*\s*(?:in)*/i)
    if(!m) m = part.match(/^[^\n]*max\s*rounds*/i)
    if(!m) return
    part = rm_match(part, m)
    m = part.match(/\s*(?:in)*([a-z0-9]+)\s*(min|minutes|minute)(.*)/i)
    if(!m) return
    minutes = to_num(m[1])
    tasks = rm_match(part,m)
  }
  m = tasks.match(/^([^\n]+)/i)
  if(m) tasks = rm_match(tasks,m)
  
  m = tasks.match(/(rest\s*(\d+)\s*minutes*)*\s*\.*\s*repeat\s*([^\n]+)\s*(\d+)\s*(times|cycles)/i)
  if(m){
    repeat = Number(m[4])
    if(m[1]) between_rounds.push({
      type : 'rest'
      , duration : Number(m[2])
      , units : 'minutes'
    })
    rm_match(tasks, m)
  }
  
  var part_obj = {
    type : 'amrap'
    , duration : minutes
    , units : 'minutes'
    , tasks : parseTasks(tasks, null, settings)
  }
  if(repeat) part_obj.repeat = repeat
  if(between_rounds.length) part_obj.between_rounds = between_rounds
  return part_obj
}

function tabata(part){
  var regexp = /^\s*(\d+)\s*round(?:s*)[\s,]*(?:of)?[\s,]*(\d+)\s*(?:second(?:s*))?\s*on[\s,]*(\d+)\s*(?:second(?:s*))?\s*(?:off|rest)(?:.*?)$/im
    , matches = part.match(regexp)
    , rounds = 8
    , on = 20
    , off = 10
    , duration = null
  
  //process.exit()
  
  if(matches){
    rounds = matches[1]
    on = matches[2]
    off = matches[3]
    part = rm_match(part,matches)
  }else{
    
    // get the first line
    matches = part.match(/^(.*)\n/m)
    if(!matches) return null
    var first_line = matches[1]
    
    // see if contains the word tabata
    if(!first_line.match(/tabata/i)) return null
    
    // see if it contains 'N round(s)'
    matches = first_line.match(/^(?:.*?)(\d+)\s*round(?:s*)(?:.*?)$/im)
    if(matches) rounds = matches[1]
    else{
      // see if it contains 'N minutes'
      matches = first_line.match(/(\d+)\s*minute(?:s*)/i)
      if(!matches) return null
      duration = matches[1]
    }
    part = part.replace(first_line,'')
  }
  
  function parseTasks(tasks, reps){
    if(typeof tasks === 'string') tasks = tasks.split(/(\n+)/)
    tasks = _.filter(tasks, function(task){ return !task.match(/^(\s)*$/) })
    var ret_tasks = []
    for(var i = 0; i < tasks.length; i++){
      var task = tasks[i]
      // this probably isn't a task so it probably means there aren't anymore tasks
      if(task.length > 100 || task.split(' ').length > 10){
        break;
      }
      ret_tasks.push({
        type : task
        , reps : 'max'
      })
    }
    return ret_tasks
  }
  
  var tasks = parseTasks(part)
  
  if(!duration) duration = rounds * tasks.length * 30
  
  return {
    type : 'tabata'
    , duration : duration * 1000
    , tasks : tasks
  }
}