## Description

Straightforward tool to convert Commonjs files into ESM

---
## Installation

```shell
npm install to-esm
```

---
## Usage

```shell
toesm --input=<inputFilesPattern> --output=<outputDirectory> [--noheader]
```

### Examples

The following examples will work on a folder structure that looks like this:
>
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

### In this example, we also, convert files in subdirectories (keeping folder structure)
```shell
toesm.cmd  --input="example/cjs/**/*.?(c)js" --output=example/esm/
```

### When dealing with multiple folders, it's best to use this format (For better path resolution)
```shell
toesm.cmd  --input="folder1/cjs/**/*.?(c)js" --input="folder2/**/*.cjs" --output=outdir1/esm/ --output=outdir2/esm/
```
---
## Options

### Options to not generate automatic header
>
> --noheader



