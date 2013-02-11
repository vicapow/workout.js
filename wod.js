
var _ = require('underscore')
  , taskParsers = require('./tasks')
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
    // console.log('lines')
    // _.chain(lines).each(function(line){
    //   console.log('line: ' + line)
    // })
    
    var res = wod_settings(part)
    var settings = res.settings
    part = res.part
    
    res = tabata(part, settings)
      || amrap(part, settings)
      || rounds(part, settings)
      || reps(part, settings)
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
  console.log('---------wearing---------')
  console.log(part)
  m = part.match(/wear(?:ing)*\s*a*\s*(\d+)*\s*(?:pound|lb)*\s*(?:weighted)*\s*vest/i)
  console.log(m)
  if(m){
    settings.wear = []
    var vest = { type : 'vest' }
    if(m[1]){
      vest.weight = Number(m[1])
      vest.units = 'pounds'
    }
    settings.wear.push(vest)
    part = rm_match(part, m)
  }
  return {
    settings : settings
    , part : part
  }
}


function reps(part, settings){
  var regexp = /^\s*((?:\d+)(?:-\d+)*)\s*reps*\s*(?:for)*\s*(time|form)*\s*(?:of)*\:*\s*/im
  var m = part.match(regexp)
  if(!m) return
  var reps = _.map(m[1].split('-'), Number)
  var reps_for =m[2] ? m[2].toLowerCase() : 'time'
  var tasks = rm_match(part,m)
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
  
  for(var i = 0; i < tasks.length;i++){
    task = tasks[i]
    if(!_.some(taskParsers, function(parser, key){ 
      var ret = parser(task, reps, settings) 
      if(ret){
        task = ret
        return true
      }
    })){
      task = {
        type : 'unknown'
        , desc : task
      }
    }
    ret_tasks.push(task)
  }
  return ret_tasks
}

function amrap(part, settings){
  var m = part.match(/^\s*(\d+)\s*(?:min|minutes|minute)?\s*AMRAP\s*:?\s*/i)
  var task, minutes
  if(m){
    minutes = Number(m[1])
    tasks = rm_match(part,m)
  }else{
    m = part.match(/^\s*complete*\s*as\s*many\s*rounds\s*(?:as)*\s*(?:possible)*\s*(?:in)*/i)
    if(!m) return
    part = rm_match(part,m)
    m = part.match(/\s*(?:in)*([a-z0-9]+)\s*(min|minutes|minute)(.*)/i)
    if(!m) return
    minutes = to_num(m[1])
    tasks = rm_match(part,m)
  }
  m = tasks.match(/^([^\n]+)/i)
  if(m) tasks = rm_match(tasks,m)
  return {
    type : 'amrap'
    , duration : minutes
    , units : 'minutes'
    , tasks : parseTasks(tasks, null, settings)
  }
}

function tabata(part){
  var regexp = /^\s*(\d+)\s*round(?:s*)[\s,]*(?:of)?[\s,]*(\d+)\s*(?:second(?:s*))?\s*on[\s,]*(\d+)\s*(?:second(?:s*))?\s*(?:off|rest)(?:.*?)$/im
    , matches = part.match(regexp)
    , rounds = 8
    , on = 20
    , off = 10
    , duration = null
  
  //console.log('matches')
  //console.log(matches)
  //console.log('parts: ')
  //console.log(part)
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