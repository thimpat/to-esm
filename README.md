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
toesm --input=<inputFilesPattern> [--output=<outputDirectory>] [--noheader]
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

---
## Troubleshooting

### 😓 Uncaught SyntaxError: The requested module '***' does not provide an export named '...'

### Quick Fix => Use named exports!

Replace things like:
```javascript
module.exports = {
    COLOR_TABLE: ["#FFA07A", "#FF7F50", "#FF6347"]
}
```

with:

```javascript
module.exports.COLOR_TABLE = ["#FFA07A", "#FF7F50", "#FF6347"];
```

or

```javascript
const val = {
    COLOR_TABLE: ["#FFA07A", "#FF7F50", "#FF6347"]
};
module.exports = val.COLOR_TABLE;
```


### Long Explanation (In case of struggle with the concept of Named Export)

Quite often, when we export a library within the Node environment (CommonJs modules), we do something like:

```javascript
// => "./my-js" 
module.exports = {
    COLOR_TABLE: ["#FFA07A", "#FF7F50", "#FF6347"]
}
```

Then when comes the time to import it, we do:
```javascript
const {COLOR_TABLE} = require("./my-js");
```

However, after the conversion to ESM, you will find that the export is not "named":

Conversion to ESM of the above code
```javascript
// => "./my-js.mjs" 
export default {
    COLOR_TABLE: ["#FFA07A", "#FF7F50", "#FF6347"]
}
```

```javascript
import {COLOR_TABLE} from "./my-js.mjs"
```

```const {something} = ...``` is different from ```import {something}```

##### Destructuring assignment

====> ```const {something} = ...``` uses the Destructuring assignment feature of JavaScript (ES6 / ES2015), which is the
reason things like below is possible:
```javascript
Const myObject = {something: "Great"}
const {something} = myObject;          
```

##### Import statement
====> ```import {something}``` uses the import ESM feature.

You can't do things like:
```javascript
Const myObject = {something: "Great"};
import {something} from myObject;       // 👀 <= myObject is not a file path
```
There is no destructuring here. ESM is expecting a file path.
If myObject were correctly a path, ESM would look into the table of exported named values against
the given file to do the assignment.

###### Named Exports (ESM)
Therefore, the passed file must explicitly export the "something" key.
We could do:

```javascript
// => Named Export
export const something = ...
```
In this example, we have done a named export.

###### Default Exports (ESM)
For default export, we would do:

```javascript
// => Named Export
export default ...
```

###### Default Exports (CJS)
The tool, when parsing something like below, is assuming you want to do a default export:
```javascript
module.exports = {
    COLOR_TABLE: ["#FFA07A", "#FF7F50", "#FF6347"],
    COLOR_LINE: ["#FFA07A", "#FF7F50", "#FF6347"],
    COLOR_ROW: ["#FFA07A", "#FF7F50", "#FF6347"],
}
```

###### Default Exports (ESM)

It could do the named export for you, but things like:
```javascript
module.exports = {
    [MY_VAR]: "Look!",
    COLOR_TABLE: ["#FFA07A", "#FF7F50", "#FF6347"],
    COLOR_LINE: ["#FFA07A", "#FF7F50", "#FF6347"],
    COLOR_ROW: ["#FFA07A", "#FF7F50", "#FF6347"],
}
```

[MY_VAR] uses the Computed property names feature of ES2015, specifically known at runtime.
Therefore, we let the user do the Name Export instead of assuming.

