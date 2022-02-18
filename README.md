
[![Test workflow](https://github.com/thimpat/to-esm/actions/workflows/test.yml/badge.svg)](https://github.com/thimpat/to-esm/blob/main/README.md)
[![nycrc Coverage](https://img.shields.io/nycrc/thimpat/to-esm?preferredThreshold=lines)](https://github.com/thimpat/to-esm/blob/main/README.md)
[![Version workflow](https://github.com/thimpat/to-esm/actions/workflows/versioning.yml/badge.svg)](https://github.com/thimpat/to-esm/blob/main/README.md)
[![npm version](https://badge.fury.io/js/to-esm.svg)](https://www.npmjs.com/package/to-esm)
<img alt="semantic-release" src="https://img.shields.io/badge/semantic--release-19.0.2-e10079?logo=semantic-release">


## Description



A tool to convert Commonjs files into ESM



<br>



---

## Installation



```shell

npm install to-esm

```



<br>



---

## Usage



```shell

to-esm --input=<inputFilesPattern> [--output=<outputDirectory>] [--html=<htmlFilePattern>] [--noheader] [--solvedep] 
[--extended] [--comments] [--target=<browser|terminal>]

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
>
> example/index.html



<br>



### Create a copy of input.js and convert it to ESM (input.mjs)

The example below will convert ./example/cjs/input.cjs to ./input.mjs in the working directory.
Note that to-esm will also follow the linked files.

```shell

# Generates => 📝 ./input.mjs

to-esm  --input=example/cjs/input.cjs

```


<br>


### Automatically write an importmap within html files

An import map will allow writing named imports like ```import rgbhex from "rgb-hex"``` rather than specifying a 
whole path ```import rgbhex from "../../../path/to/rgb-hex.mjs"``.

```shell
# Generates => 📝 ./example/cjs/input.mjs

to-esm --input="example/cjs/demo.cjs" --output=generated/browser/ --config=".toesm.cjs" --html=example/*.html
```

###### See below to see how to structure .toesm.cjs

📝 index.html ↴
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script type="importmap">
        {
          "imports": {
            "rgb-hex": "./node_modules/rgb-hex/index.js"
          }
        }
    </script>
</head>
<body>
<script type="module" src="actual/demo-test.mjs"></script>
</body>
</html>
```

<br>



### Convert all .cjs and .js files into example/esm keeping folder structure

Note that it is only helpful to do this when the files are not connected to each other (or some conversions failed)

```shell

to-esm  --input="example/cjs/*.?(c)js" --output=example/esm/

```

<br>



### We can specify multiple directories if necessary

```shell

to-esm  --input="folder1/cjs/**/*.?(c)js" --input="folder2/**/*.cjs" --output=outdir1/esm/ --output=outdir2/esm/

```



<br><br>





## Options (via command line)


| **Options**  | **Description**                                 |                     |
|--------------|-------------------------------------------------|---------------------
| --input      | _File list to convert_                          | **Only required option**
| --output     | _Output directory_                              |
| --html       | _html files to receive importmaps_              |
| --noHeader   | _Options to not generate automatic header_      |
| --withReport | _Output conversion in the console_              |
| --comments   | _Allow converting code in comments and strings_ |
| --target     | _Setting the targeted environment_              | all / esm / browser |  



<br><br>



## Advanced Options (via config file)



To apply advanced options, create a config file and make the CLI point to it.

>
> to-esm --input=... --output=... --config=.to-esm.cjs

Keys within the config file are case sensitive.



### Options to replace strings before and after every conversion

#### [replaceStart, replaceEnd]

📝 .toesm.cjs ↴

```javascript

module.exports = {
    replaceStart: [
        {
            search : "const chalk = require(\"chalk\");",
            replace: "// ***"
        },
        {
            search : /const\s+colors\s*=\s*require\(.colors.\);/g,
            replace: "// ***"
        }
    ],
    replaceEnd  : [
        {
            search : `// ***`,
            replace: "// --------- chalk and colors were replaced ----------------"
        }
    ]
}

```

| **Options**          | **Description**                                                       | 
|----------------------|-----------------------------------------------------------------------|
| replaceStart         | _will perform a replacement **_before_** doing the conversion to ESM_ |
| replaceEnd           | _will perform a replacement **_after_** doing the conversion to ESM_  |
| replaceStart.search  | _The regex pattern or string to replace_                              |
| replaceStart.replace | _The replacement sentence_                                            |


<br><br>




### Options to use two different modules of the same library.

#### [replaceModules]

Sometimes, you may find libraries where only ESM is available when CJS was available on older versions.

This option allows setting a different version depending on the environment used.

For instance, the module "chalk" uses ESM for its Export on its latest version (5.0.0) and CJS for the older version (4.

1.2).

You can setup toesm to use the appropriate version depending on your config file:



📝 .toesm.cjs ↴

```javascript
module.exports = {
    replaceModules:
        {
            "rgb-hex":
                {
                    cjs: {
                        name   : "rgb-hex-cjs",
                        version: "@^3.0.0"
                    },
                    esm: {
                        version: "@latest"
                    }
                }
        },
    }        
```


In the .cjs file to convert, you would write:

```javascript
const rgbhex = require("rgb-hex-cjs");
```

Which is going to be transformed to:

```javascript
import rgbhex  from "RGB-hex";
```


| **Options**                       | **Description**                                         | 
|-----------------------------------|---------------------------------------------------------|
| replaceModules[\<moduleName>]     | _The module we want to use two different versions with_ |
| replaceModules[\<moduleName>].cjs | _The module version to use with CommonJs files_         |
| replaceModules[\<moduleName>].mjs | _The module version to use with converted files_        |


<br><br>


### Options to set html sources and manipulate importmaps.

####[html]

```html
module.exports = {
    html          :
        {
            pattern: "/index.html",
            importmap       : {
                "ttt": "http://somewhere"
            },
            importmapReplace: [{
                search : "./node_modules",
                replace: `/node_modules`,
            }],
        }
}
```


| **Options**                       | **Description**                                    | 
|-----------------------------------|----------------------------------------------------|
| pattern                    | _HTML file pattern where importmap needs updating_ |
| importmap                    | _value to add to html files_                       |
| importmapReplace                             | _Apply replacements on the importmap list_         |


<br/><br/>

##### Quick description

When we specify "importmap" in the browser,
instead of using long paths to identify the location of a library, we can use identifiers to state their place.

For instance, with this html:

```html

    <script type="importmap">
        {
          "imports": {
            "my-project": "../node_modules/my-project/src/esm/add.mjs",
            "lodash": "https://cdn.jsdelivr.net/npm/lodash@4.17.10/lodash.min.js"  // ← Example 
          }
        }
    </script>

```

Instead of writing:
```javascript
import {add} from "../node_modules/my-project/src/esm/add.mjs"
```

We can write this:

```javascript
import {add} from "my-project"
```


---

## Directives

### Directives to replace code directly from the source.

You can, if you want, also use some to-esm directives within the code.
For instance, the code below will not appear when the target is a browser.

```javascript
/** to-esm-browser: remove **/
const path = require("path");
const fs = require("fs");
const os = require("os");
/** to-esm-browser: end-remove **/
```



<br><br>

### Directives to add code to the source.

It is also possible to add code.

📝 code.cjs ↴
```javascript
/** to-esm-browser: add
    this.realConsoleLog("LogToFile is not supported in this environment. ")
* **/
```

In this example, after conversion, the above code will become this:

📝 code.mjs (with target browser) ↴
```javascript
this.realConsoleLog("LogToFile is not supported in this environment. ")
```

<br><br>

---

### Directives to ignore code during the parsing, so it won't be converted by mistake.

```javascript
/** to-esm-all: skip **/
console.log("Skip this");
/** to-esm-all: end-skip **/
```

<br><br>

---

## Troubleshooting



### 😓 Uncaught SyntaxError: The requested module '***' does not provide an export named '...'



### Quick Fix => Use named exports



Replace structure like:

```javascript

module.exports = {
    COLOR_TABLE: ["#FFA07A", "#FF7F50", "#FF6347"]
}
```

with:

```javascript

module.exports.COLOR_TABLE = ["#FFA07A", "#FF7F50", "#FF6347"];
```

<br><br>



<br><br><br><br>



<br><br><br><br>
## Create a Hybrid Library



<br><br>



### 1- Have all of your CommonJs code in a subdirectories



![img.png](https://github.com/thimpat/to-esm/blob/main/docs/images/img.png)



Here we put all of our existing code within the cjs directory.



<br/>



### 2- Change CommonJs file extensions to .cjs



Refactor the files that use CommonJs modules to have the new .cjs extensions.



<br/>



### 3- Run the to-esm command



Generate the ESM code into the targeted directory.



```shell

to-esm.cmd --input="src/cjs/**/*.?(c)js" --output=src/esm/

```



<br/>





###### ⭐ Overview ↴



![](https://github.com/thimpat/to-esm/blob/main/docs/images/convert-to-esm-1.gif)



### 4- Update your package.json to point to the correct target based on the environment



```JSON

{
  "name": "my-project",
  "version": "1.0.0",
  "description": "",
  "main": "src/cjs/add.cjs",             ← 
  "module": "src/ejs/add.mjs",           ←  
  "type": "module",                      ←   
  "scripts": {
    "gen:esm": "toesm.cmd --input=\"src/cjs/demo.cjs\" --output=src/esm/"
  },
  "exports": {
    ".":{
      "require": "./src/cjs/add.cjs",    ← 
      "import": "./src/esm/add.mjs"      ← 
    }
  },
  "author": "",
  "license": "ISC"
}
```

