'use strict';
console.log(process.pid)

function nodeToText(node) {
  return node.functionName +
    (node.url        ? ' ' + node.url        : '') +
    (node.lineNumber ? ':' + node.lineNumber : '')
}

function updateRetainedHitCount(parents, hitCount) {
  for (var i = 0; i < parents.length; i++) {
    parents[i].retainedHitCount += hitCount;
  }
}

function processNode(node, parents, hash) {
  var p, i, text = '';
  
  if (!node.children || !node.children.length) {
    // when we reach the leaf we process it and it's parents
    for (i = 0; i < parents.length; i++) {
      p = parents[i];  
      if (i > 0) text += ';';

      text += nodeToText(p);

      if (!hash[text]) hash[text] = p.retainedHitCount;
      else hash[text] += p.retainedHitCount;
    }
    return false;
  }
  return true;
}

function collapseRec(node, parents, hash) {
  var i;

  updateRetainedHitCount(parents, node.hitCount);

  node.retainedHitCount = node.hitCount;

  // need concat here to create a copy (slow tough, so may need to find better algo)
  // TODO: concat is slow though and takes most of our time, manifesting itself via:
  //       calls to StoreIC:hasEnumerable_ 
  parents = parents.concat(node);

  var hasChildren = processNode(node, parents, hash);
  if (!hasChildren) return;


  for (i = 0; i < node.children.length; i++) {
    collapseRec(node.children[i], parents, hash);
  }

}

function toLine(k, idx, hash) {
  /*jshint validthis:true */
  return k + ' ' + this[k]    
}

function CpuProfileCollapser() {
  if (!(this instanceof CpuProfileCollapser)) return new CpuProfileCollapser();
  this._lines = [];
}

module.exports = CpuProfileCollapser; 
var proto = CpuProfileCollapser.prototype;

proto._collapse = function collapse(obj) {
  var root = obj.head;
  var hash = {};
  collapseRec(root, [], hash);
  return Object.keys(hash).map(toLine, hash);
}

proto.collapseArray = function collapseArray(arr) {
  var json = arr.join('\n');
  return this._collapse(JSON.parse(json));
}

// Test
function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

/*if (!module.parent && typeof window === 'undefined') {
  // var json = require('fs').readFileSync(__dirname + '/../test/fixtures/v8-profiler.cpuprofile');
  var json = require('fs').readFileSync('/tmp/profile-50989.cpuprofile');
  var obj = JSON.parse(json);
  var res = new CpuProfileCollapser()._collapse(obj)
  console.log(res.length)
}*/
