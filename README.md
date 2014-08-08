# flamegraph [![build status](https://secure.travis-ci.org/thlorenz/flamegraph.png)](http://travis-ci.org/thlorenz/flamegraph) 

[![testling badge](https://ci.testling.com/thlorenz/flamegraph.png)](https://ci.testling.com/thlorenz/flamegraph)

Generate flamegraphs with Node.js or in the browser.

```
cat instruments-callgraph.csv | flamegraph -t instruments > flamegraph.svg
```

## Installation

    npm install flamegraph

## Usage

```
flamegraph <options>

Generates a flamegraph from the callgraph data of the given `inputtype` that is streamed into it.

OPTIONS:

  --inputtype -t  the type of callgraph (only 'instruments' supported at this point)

  --fonttype      font family used                  default: 'Verdana'
  --fontsize      base text size                    default: 12
  --imagewidth    max width, pixels                 default: 1200
  --frameheight   max height is dynamic             default: 16.0
  --fontwidth     avg width relative to fontsize    default: 0.59
  --minwidth      min function width, pixels        default: 0.1
  --countname     what are the counts in the data?  default: 'samples'
  --colors        color theme                       default: 'hot'
  --bgcolor1      background color gradient start   default: '#eeeeee'
  --bgcolor2      background color gradient stop    default: '#eeeeb0'
  --timemax       (override the) sum of the counts  default: Infinity
  --factor        factor to scale counts by         default: 1
  --hash          color by function name            default: true
  --titletext     centered heading                  default: 'Flame Graph'
  --nametype      what are the names in the data?   default: 'Function:'

  --help      -h  print this help message 

EXAMPLE:

  cat instruments-callgraph.csv | flamegraph -t instruments > flamegraph.svg
```

## API

<!-- START docme generated API please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN docme TO UPDATE -->

<div>
<div class="jsdoc-githubify">
<section>
<article>
<div class="container-overview">
<dl class="details">
</dl>
</div>
<dl>
<dt>
<h4 class="name" id="flamegraph"><span class="type-signature"></span>flamegraph<span class="signature">(stream, opts)</span><span class="type-signature"></span></h4>
</dt>
<dd>
<div class="description">
<p>Converts a stream of call graph lines into an svg document.</p>
</div>
<h5>Parameters:</h5>
<table class="params">
<thead>
<tr>
<th>Name</th>
<th>Type</th>
<th class="last">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td class="name"><code>stream</code></td>
<td class="type">
<span class="param-type">ReadableStream</span>
</td>
<td class="description last"><p>that will emit the call graph lines to be parsed</p></td>
</tr>
<tr>
<td class="name"><code>opts</code></td>
<td class="type">
<span class="param-type">Object</span>
</td>
<td class="description last"><p>objects that affect the visualization</p>
<h6>Properties</h6>
<table class="params">
<thead>
<tr>
<th>Name</th>
<th>Type</th>
<th>Argument</th>
<th class="last">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td class="name"><code>inputtype</code></td>
<td class="type">
<span class="param-type">string</span>
</td>
<td class="attributes">
</td>
<td class="description last"><p>the type of callgraph <code>instruments |</code></p></td>
</tr>
<tr>
<td class="name"><code>fonttype</code></td>
<td class="type">
<span class="param-type">string</span>
</td>
<td class="attributes">
&lt;optional><br>
</td>
<td class="description last"><p>default: <code>'Verdana'</code></p></td>
</tr>
<tr>
<td class="name"><code>fontsize</code></td>
<td class="type">
<span class="param-type">number</span>
</td>
<td class="attributes">
&lt;optional><br>
</td>
<td class="description last"><p>base text size                    default: <code>12</code></p></td>
</tr>
<tr>
<td class="name"><code>imagewidth</code></td>
<td class="type">
<span class="param-type">number</span>
</td>
<td class="attributes">
&lt;optional><br>
</td>
<td class="description last"><p>max width, pixels                 default: <code>1200</code></p></td>
</tr>
<tr>
<td class="name"><code>frameheight</code></td>
<td class="type">
<span class="param-type">number</span>
</td>
<td class="attributes">
&lt;optional><br>
</td>
<td class="description last"><p>max height is dynamic             default: <code>16.0</code></p></td>
</tr>
<tr>
<td class="name"><code>fontwidth</code></td>
<td class="type">
<span class="param-type">number</span>
</td>
<td class="attributes">
&lt;optional><br>
</td>
<td class="description last"><p>avg width relative to fontsize    default: <code>0.59</code></p></td>
</tr>
<tr>
<td class="name"><code>minwidth</code></td>
<td class="type">
<span class="param-type">number</span>
</td>
<td class="attributes">
&lt;optional><br>
</td>
<td class="description last"><p>min function width, pixels        default: <code>0.1</code></p></td>
</tr>
<tr>
<td class="name"><code>countname</code></td>
<td class="type">
<span class="param-type">string</span>
</td>
<td class="attributes">
&lt;optional><br>
</td>
<td class="description last"><p>what are the counts in the data?  default: <code>'samples'</code></p></td>
</tr>
<tr>
<td class="name"><code>colors</code></td>
<td class="type">
<span class="param-type">string</span>
</td>
<td class="attributes">
&lt;optional><br>
</td>
<td class="description last"><p>color theme                       default: <code>'hot'</code></p></td>
</tr>
<tr>
<td class="name"><code>bgcolor1</code></td>
<td class="type">
<span class="param-type">string</span>
</td>
<td class="attributes">
&lt;optional><br>
</td>
<td class="description last"><p>background color gradient start   default: <code>'#eeeeee'</code></p></td>
</tr>
<tr>
<td class="name"><code>bgcolor2</code></td>
<td class="type">
<span class="param-type">string</span>
</td>
<td class="attributes">
&lt;optional><br>
</td>
<td class="description last"><p>background color gradient stop    default: <code>'#eeeeb0'</code></p></td>
</tr>
<tr>
<td class="name"><code>timemax</code></td>
<td class="type">
<span class="param-type">number</span>
</td>
<td class="attributes">
&lt;optional><br>
</td>
<td class="description last"><p>(override the) sum of the counts  default: <code>Infinity</code></p></td>
</tr>
<tr>
<td class="name"><code>factor</code></td>
<td class="type">
<span class="param-type">number</span>
</td>
<td class="attributes">
&lt;optional><br>
</td>
<td class="description last"><p>factor to scale counts by         default: <code>1</code></p></td>
</tr>
<tr>
<td class="name"><code>hash</code></td>
<td class="type">
<span class="param-type">boolean</span>
</td>
<td class="attributes">
&lt;optional><br>
</td>
<td class="description last"><p>color by function name            default: <code>true</code></p></td>
</tr>
<tr>
<td class="name"><code>titletext</code></td>
<td class="type">
<span class="param-type">string</span>
</td>
<td class="attributes">
&lt;optional><br>
</td>
<td class="description last"><p>centered heading                  default: <code>'Flame Graph'</code></p></td>
</tr>
<tr>
<td class="name"><code>nametype</code></td>
<td class="type">
<span class="param-type">string</span>
</td>
<td class="attributes">
&lt;optional><br>
</td>
<td class="description last"><p>what are the names in the data?   default: <code>'Function:'</code></p></td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<dl class="details">
<dt class="tag-source">Source:</dt>
<dd class="tag-source"><ul class="dummy">
<li>
<a href="https://github.com/thlorenz/flamegraphs/blob/master/index.js">index.js</a>
<span>, </span>
<a href="https://github.com/thlorenz/flamegraphs/blob/master/index.js#L11">lineno 11</a>
</li>
</ul></dd>
</dl>
</dd>
<dt>
<h4 class="name" id="flamegraph::stackCollapseInstruments"><span class="type-signature"></span>flamegraph::stackCollapseInstruments<span class="signature">()</span><span class="type-signature"> &rarr; {TransformStream}</span></h4>
</dt>
<dd>
<div class="description">
<p>Collapses a callgraph inside an Instruments generated <code>.csv</code> file line by line.</p>
</div>
<dl class="details">
<dt class="tag-source">Source:</dt>
<dd class="tag-source"><ul class="dummy">
<li>
<a href="https://github.com/thlorenz/flamegraphs/blob/master/lib/stackcollapse-instruments.js">lib/stackcollapse-instruments.js</a>
<span>, </span>
<a href="https://github.com/thlorenz/flamegraphs/blob/master/lib/stackcollapse-instruments.js#L29">lineno 29</a>
</li>
</ul></dd>
</dl>
<h5>Returns:</h5>
<div class="param-desc">
<p>stream into which to pipe the lines of the <code>.csv</code> file</p>
</div>
<dl>
<dt>
Type
</dt>
<dd>
<span class="param-type">TransformStream</span>
</dd>
</dl>
</dd>
<dt>
<h4 class="name" id="flamegraph::svg"><span class="type-signature"></span>flamegraph::svg<span class="signature">(collapsedLines, opts)</span><span class="type-signature"> &rarr; {string}</span></h4>
</dt>
<dd>
<div class="description">
<p>Creates a context from a call graph that has been collapsed (<code>stackcollapse-*</code>) and renders svg from it.</p>
</div>
<h5>Parameters:</h5>
<table class="params">
<thead>
<tr>
<th>Name</th>
<th>Type</th>
<th class="last">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td class="name"><code>collapsedLines</code></td>
<td class="type">
<span class="param-type">Array.&lt;string></span>
</td>
<td class="description last"><p>callgraph that has been collapsed</p></td>
</tr>
<tr>
<td class="name"><code>opts</code></td>
<td class="type">
<span class="param-type">Object</span>
</td>
<td class="description last"><p>options</p></td>
</tr>
</tbody>
</table>
<dl class="details">
<dt class="tag-source">Source:</dt>
<dd class="tag-source"><ul class="dummy">
<li>
<a href="https://github.com/thlorenz/flamegraphs/blob/master/lib/svg.js">lib/svg.js</a>
<span>, </span>
<a href="https://github.com/thlorenz/flamegraphs/blob/master/lib/svg.js#L11">lineno 11</a>
</li>
</ul></dd>
</dl>
<h5>Returns:</h5>
<div class="param-desc">
<p>svg</p>
</div>
<dl>
<dt>
Type
</dt>
<dd>
<span class="param-type">string</span>
</dd>
</dl>
</dd>
</dl>
</article>
</section>
</div>

*generated with [docme](https://github.com/thlorenz/docme)*
</div>
<!-- END docme generated API please keep comment here to allow auto update -->

## Kudos

This library is an adaptation of @brendangregg's [FlameGraph perl scripts](https://github.com/brendangregg/FlameGraph).

## License

MIT
