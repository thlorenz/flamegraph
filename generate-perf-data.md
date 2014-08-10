## Run your app with perf

```
perf record -e cycles:u -g -- node --perf-basic-prof app.js
```

## Extract trace from `perf.data` file

```
perf script > perf-script.txt
```

## Convert the script data into a flamegraph

Either via the browser or via

```
cat perf-script.txt | flamegraph -t perf > perf-graph.svg
```
