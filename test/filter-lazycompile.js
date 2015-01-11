'use strict';

var test = require('tape')
  , filter = require('../lib/filter-lazycompile')

var folded = [
    'OptimizingCompi;start_thread;v8::internal::ThreadEntry(void*);v8::internal::OptimizingCompilerThread::Run();v8::internal::OptimizingCompilerThread::CompileNext();v8::internal::OptimizedCompileJob::OptimizeGraph();__clock_gettime;__vdso_clock_gettime 12'
  ,   'Stub:JSEntryStub;Builtin:JSEntryTrampoline;'
    + 'Builtin:ArgumentsAdaptorTrampoline;LazyCompile:~onread net.js:492;'
    + 'Builtin:ArgumentsAdaptorTrampoline;LazyCompile:*Readable.push _stream_readable.js:114;'
    + 'LazyCompile:~readableAddChunk _stream_readable.js:134;'
    + 'Builtin:ArgumentsAdaptorTrampoline;'
    + '__clock_gettime;__vdso_clock_gettime 6'
  ]

test('\nfiltering lazycompile using default options', function (t) {
  var filtered = filter(folded)
  t.equal(filtered[0], folded[0], 'does not change lines without LazyCompile')
  t.equal(filtered[1]
    ,   'Stub:JSEntryStub;Builtin:JSEntryTrampoline;'
      + 'Builtin:ArgumentsAdaptorTrampoline;-onread net.js:492;'
      + 'Builtin:ArgumentsAdaptorTrampoline;-Readable.push _stream_readable.js:114;'
      + '-readableAddChunk _stream_readable.js:134;'
      + 'Builtin:ArgumentsAdaptorTrampoline;'
      + '__clock_gettime;__vdso_clock_gettime 6'
    , 'removes LazyCompile and function optimization info'
  )
  t.end()
})

test('\nfiltering lazycompile using options indicating we want to keep function optimization info', function (t) {
  var filtered = filter(folded, { optimizationinfo: true })
  t.equal(filtered[0], folded[0], 'does not change lines without LazyCompile')
  t.equal(filtered[1]
    ,   'Stub:JSEntryStub;Builtin:JSEntryTrampoline;'
      + 'Builtin:ArgumentsAdaptorTrampoline;~onread net.js:492;'
      + 'Builtin:ArgumentsAdaptorTrampoline;*Readable.push _stream_readable.js:114;'
      + '~readableAddChunk _stream_readable.js:134;'
      + 'Builtin:ArgumentsAdaptorTrampoline;'
      + '__clock_gettime;__vdso_clock_gettime 6'
    , 'removes LazyCompile and keeps function optimization info'
  )
  t.end()
})
