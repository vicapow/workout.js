var utils = {}
module.exports = utils


utils.rm_match = function(str,m){
  if(!m) return str
  return str.substring(0,m.index) + str.substring(m.index + m[0].length)
}