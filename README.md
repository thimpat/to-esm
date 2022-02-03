## Description

Straightforward tool to convert Commonjs files into ESM

---
## Installation

```shell
npm install cjs-to-esm-converter
```

---
## Usage

The following examples will work on a folder structure that looks like this:
> example/cjs/input.js
>
> example/cjs/dep-1.cjs
>
> example/cjs/dep-2.cjs


### Create a copy of input.js and convert it to ESM (input.mjs)
```shell
# Generates => ./example/cjs/input.mjs
toesm.cmd  --input=example/cjs/*.js
```

### Convert input.js copy (all .js in this directory) to a different location
```shell
# Generates => ./example/esm/input.mjs
toesm.cmd  --input=example/cjs/*.js --output=example/esm/
```

### Convert all .cjs and .js files
```shell
toesm.cmd  --input="example/cjs/*.?(c)js" --output=example/esm/
```
---
## Options

### Options to not generate automatic header
> --noheader



