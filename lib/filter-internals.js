'use strict';

var v8Internals =
    '__libc_start|node::Start\\('                                                     // node startup
  + '|v8::internal::|v8::Function::Call|v8::Function::NewInstance'                    // v8 internal C++
  + '|Builtin:|Stub:|StoreIC:|LoadIC:|LoadPolymorphicIC:|KeyedLoadIC:'                // v8 generated boilerplate 
  + '|<Unknown Address>|_platform_\\w+\\$VARIANT\\$|DYLD-STUB\\$|_os_lock_spin_lock'  // unknown and lower level things

var unresolveds = /;0x[0-9A-Fa-f]{2,12}/g // lonely unresolved hex address

var midHead  = '('
  , midTail  = ')[^;]+;'
  , lastHead = '(.+?);((?:'
  , lastTail = ')[^;]+?)( \\d+$)'

var v8MidRegex = new RegExp(midHead + v8Internals + midTail, 'g')
  , v8LastRegex = new RegExp(lastHead + v8Internals + lastTail)

function filterLine(l) {
  return l
    .replace(unresolveds, '')
    // just remove matches in between two semicolons, i.e.: ; .. ;
    .replace(v8MidRegex, '')
    // if it's the last function in the stack removal is a bit different since we no ; delimits the end
    // it's probably possible to handle both cases with one regex and speed things up
    // in the process, but this will work for now
    .replace(v8LastRegex, function replaceInternals(match, before, remove, after) {
      return before + after;
    })
}

var go = module.exports = 

/**
 * Filters internal functions from the given collapsed stack.
 *
 * NOTE: no actual lines are removed, instead they are modified to remove the internal functions.
 * 
 * @name filterInternals
 * @private
 * @function
 * @param {Array.<String>} collapsed callgraph data that has been collapsed
 * @return {Array.<String>} collapsed callgraph data with internal functions removed
 */
function filterInternals(collapsed) {
  return collapsed.map(filterLine);  
}
