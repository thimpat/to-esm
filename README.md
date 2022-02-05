## Description

Straightforward tool to convert Commonjs files into ESM

<br>

---
## Installation

```shell
npm install to-esm -g
```

<br>

---
## Usage

```shell
toesm --input=<inputFilesPattern> [--output=<outputDirectory>] [--noheader]
```

<br>

### Examples

The following examples will work on a folder structure that looks like this:
>
> example/cjs/input.js
>
> example/cjs/dep-1.cjs
>
> example/cjs/dep-2.cjs

<br>

### Create a copy of input.js and convert it to ESM (input.mjs)
```shell
# Generates => 📝 ./example/cjs/input.mjs
toesm.cmd  --input=example/cjs/*.js
```

<br>

### Convert input.js copy (all .js in this directory) to a different location
```shell
# Generates => 📝 ./example/esm/input.mjs
toesm.cmd  --input=example/cjs/*.js --output=example/esm/
```
<br>

### Convert all .cjs and .js files
```shell
toesm.cmd  --input="example/cjs/*.?(c)js" --output=example/esm/
```

<br>

### In this example, we also, convert files in subdirectories (keeping folder structure)
```shell
toesm.cmd  --input="example/cjs/**/*.?(c)js" --output=example/esm/
```

<br>

### When dealing with multiple folders, it's best to use this format (For better path resolution)
```shell
toesm.cmd  --input="folder1/cjs/**/*.?(c)js" --input="folder2/**/*.cjs" --output=outdir1/esm/ --output=outdir2/esm/
```

<br><br>

---
## Options

### Options to not generate automatic header
>
> --noheader

<br>

### Options to pass a config file to replace strings before and/or after every conversion


>
> --config=.toesm.js


📝 .toesm.js ↴
```javascript
module.exports = {
    replaceStart: [
        {
            search : /const\s+chalk\s*=\s*require\(.chalk.\);/g,
            replace: "// ***"
        },
        {
            search : /const\s+chalk\s*=\s*require\(.colors.\);/g,
            replace: "// ***"
        }
    ],
    replaceEnd  : [
        {
            search : `// ***`,
            replace: "// --------- chalk and colors was replaced ----------------"
        }
    ]
}
```

**_replaceStart_** will perform a replacement **_before_** doing the conversion to ESM

**_replaceEnd_** will perform a replacement **_after_** doing the conversion to ESM

**_search_** can be a plain string or a regex
<br><br>

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
module.exports.COLOR_TABLE = val.COLOR_TABLE;
```

<br><br>

### Long Explanation (In case of struggle with the concept of Named Export)

Quite often, when we export a library within the Node environment (CommonJs modules), we do something like:

```javascript
// => 📝 "./my-js" 
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
// => 📝 "./my-js.mjs" 
export default {
    COLOR_TABLE: ["#FFA07A", "#FF7F50", "#FF6347"]
}
```

```javascript
import {COLOR_TABLE} from "./my-js.mjs"
```

In this example, the only thing exported is "default". Hence, the system cannot find COLOR_TABLE.


```const {something} = ...``` is different from ≠ ```import {something}```

<br>

##### Destructuring assignment

⇨ ```const {something} = ...``` uses the Destructuring assignment feature of JavaScript (ES6 / ES2015), which is the
reason things like below is possible:
```javascript
Const myObject = {something: "Great"}
const {something} = myObject;          
```

<br>

##### Import statement
⇨ ```import {something}``` uses the import ESM feature.

You can't do things like:
```javascript
Const myObject = {something: "Great"};
import {something} from myObject;       // 👀 <= myObject is not a file path
```
There is no destructuring here. ESM is expecting a file path.
If myObject were correctly a path, ESM would look into the **table of exported named values** against
the given file to do the assignment.

<br>

###### Named Exports (ESM)
Therefore, the passed file must explicitly export the "something" key.
We could do:

```javascript
// => Named Export
export const something = ...
```
In this example, we have done a named export.

<br>

###### Default Exports (ESM)
For default export, we would do:

```javascript
// => Named Export
export default ...
```

<br>

###### Default Exports (CJS)
The tool, when parsing something like below, is assuming you want to do a default export:
```javascript
module.exports = {
    COLOR_TABLE: ["#FFA07A", "#FF7F50", "#FF6347"],
    COLOR_LINE: ["#FFA07A", "#FF7F50", "#FF6347"],
    COLOR_ROW: ["#FFA07A", "#FF7F50", "#FF6347"],
}
```

<br>

###### Default Exports (CJS)

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

