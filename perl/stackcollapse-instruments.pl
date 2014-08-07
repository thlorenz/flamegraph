#!/usr/bin/perl -w
#
# stackcollapse-instruments.pl
#
# Parses a CSV file containing a call tree as produced by XCode
# Instruments and produces output suitable for flamegraph.pl.
#
# USAGE: ./stackcollapse-instruments.pl infile > outfile

use strict;

my @stack = ();

<>;
foreach (<>) {
	chomp;
	/(\d+)\.\d+ms[^,]+,\d+,\s+,(\s*)(.+)/ or die;
	my $func = $3;
	my $depth = length ($2);
	$stack [$depth] = $3;
	foreach my $i (0 .. $depth - 1) {
		print $stack [$i];
		print ";";
	}
	print "$func $1\n";
}

'use strict';

var stream = require('stream');
var util = require('util');

var Transform = stream.Transform;

module.exports = StackCollapseTransform;

util.inherits(StackCollapseTransform, Transform);

function StackCollapseTransform (opts) {
  if (!(this instanceof StackCollapseTransform)) return new StackCollapseTransform(opts);

  opts = opts || {};

  this._stack = [];
  
  Transform.call(this, opts);
}

var proto = StackCollapseTransform.prototype

proto._transform = function _transform(chunk, encoding, cb) {
  
};

proto.writeFrame = function writeFrame(f) {
  this.push(f);
  this.push(';');
}

proto.writeLine = function writeLine(line) {
  var matches = line.match(regexp);

  var ms = matches[1];
  var depth = matches[2].length;
  var fn = matches[3];

  stack[depth] = fn;
  stack.forEach(writeFrame);

  this.push(fn + ' ' + ms + '\n');
}
