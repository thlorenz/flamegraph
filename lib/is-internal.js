'use strict';

var v8Internals =
    '__libc_start|node::Start\\('                                                     // node startup
  + '|v8::internal::|v8::Function::Call|v8::Function::NewInstance'                    // v8 internal C++
  + '|Builtin:|Stub:|StoreIC:|LoadIC:|LoadPolymorphicIC:|KeyedLoadIC:'                // v8 generated boilerplate 
  + '|<Unknown Address>|_platform_\\w+\\$VARIANT\\$|DYLD-STUB\\$|_os_lock_spin_lock'  // unknown and lower level things

var std = 'std::__'

var unresolveds = + '0x[0-9A-Fa-f]{2,12}'  // lonely unresolved hex address
var processNames = '\\(';                 // i.e. (node) or (root)

var regex = new RegExp(
  '^(void |int |non-virtual thunk to ){0,1}('
        + v8Internals 
  + '|' + std
  + '|' + unresolveds
  + '|' + processNames
  + ')'
);

module.exports = function isInternal(fn_name) {
  return regex.test(fn_name);
}
