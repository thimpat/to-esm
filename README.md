
![Test workflow](https://github.com/thimpat/to-esm/actions/workflows/test.yml/badge.svg)
![Version workflow](https://github.com/thimpat/to-esm/actions/workflows/versioning.yml/badge.svg)
[![npm version](https://badge.fury.io/js/to-esm.svg)](https://badge.fury.io/js/to-esm)


## Description



A tool to convert Commonjs files into ESM



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

toesm --input=<inputFilesPattern> [--output=<outputDirectory>] [--noheader] [--solvedep] [--extended] [--comments]

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

toesm  --input=example/cjs/*.js

```



<br>



### Convert input.js copy (all .js in this directory) to a different location

```shell

# Generates => 📝 ./example/esm/input.mjs

toesm  --input=example/cjs/*.js --output=example/esm/

```

<br>



### Convert all .cjs and .js files

```shell

toesm  --input="example/cjs/*.?(c)js" --output=example/esm/

```



<br>



### In this example, we also, convert files in subdirectories (keeping folder structure)

```shell

toesm  --input="example/cjs/**/*.?(c)js" --output=example/esm/

```



<br>



### When dealing with multiple folders, it's best to use this format (For better path resolution)

```shell

toesm  --input="folder1/cjs/**/*.?(c)js" --input="folder2/**/*.cjs" --output=outdir1/esm/ --output=outdir2/esm/

```



<br><br>





## Options


| **Options**  | **Description**                                   | 
|--------------|-----------------------------------------------|
| --noHeader   | _Options to not generate automatic header_      |
| --withReport | _Output conversion in the console_              |
| --comments   | _Allow converting code in comments and strings_ 
| --extended   | _Allow solving dependency paths_    
| --solveDep   | Allow solving dependency paths


--solvedep: See section [**External dependencies**](#external) for lengthy explanations.



<br>



## Advanced Options (via config file)



To apply advanced options, create a config file and make the CLI point to it.

>
> toesm --input=... --output=... --config=.toesm.cjs





### Options to replace strings before and after every conversion



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



**_replaceStart_** will perform a replacement **_before_** doing the conversion to ESM



**_replaceEnd_** will perform a replacement **_after_** doing the conversion to ESM



**_search_** can be a plain string or a regex

<br><br>



### Options to use two different modules of the same library.



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
            chalk: {
                cjs: {
                    name   : "chalk-cjs",
                    version: "@^4.1.2"
                },
                esm: {
                    version: "latest"
                }
            }
        },
    "rgb-hex"     :
        {
            cjs: {
                name   : "rgb-hex-cjs",
                version: "@^3.0.0"
            },
            esm: {
                version: "@latest"
            }
        }
}        
```



In the .cjs file to convert, you would write:



```javascript

const chalk = require("chalk-cjs");

const rgbhex = require("rgb-hex-cjs");
```

Which is going to be transformed to:



```javascript

import chalk  from "chalk";

import rgbhex  from "RGB-hex";
```

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
const myObject = {something: "Great"}

const {something} = myObject;          
```



<br>



##### Import statement

⇨ ```import {something}``` uses the import ESM feature.



You can't do things like:

```javascript

const myObject = {something: "Great"};

import {something} from myObject;       // 👀 <= myObject is not a file path
```

There is no object destructuring here. ESM is expecting a file path.

If myObject were a path, ESM would look into the **table of exported named values** against

the given file to do the assignment.



<br>



###### Named Exports (ESM)

Therefore, the passed file must explicitly export the "COLOR_TABLE" key.



We could do:



```javascript

// => Named Export

export const COLOR_TABLE = ...
```

And voila, we have done a named export.



<br>



###### Default Exports (ESM)

For default export, we would do:



```javascript
// => Default Export
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



It could do the named export for you, but things like below makes the export more complicated.

Plus, a default export should still be possible.

```javascript

module.exports = {
    [MY_VAR]: "Look!",
    COLOR_TABLE: ["#FFA07A", "#FF7F50", "#FF6347"],
    COLOR_LINE: ["#FFA07A", "#FF7F50", "#FF6347"],
    COLOR_ROW: ["#FFA07A", "#FF7F50", "#FF6347"],
}
```



👉 [MY_VAR] _uses the Computed property names feature of ES2015, known explicitly at runtime._



Many situations lead to letting the user do the Name Export. Especially, if the translated code should resemble the

original code.





---



## Create a Hybrid Library



<br><br>



### 1- Have all of your CommonJs code in a subdirectories



![img.png](https://github.com/thimpat/to-esm/blob/main/docs/images/img.png)



Here we put all of our existing code within the cjs directory.



<br/>



### 2- Change CommonJs file extensions to .cjs



Refactor the files that use CommonJs modules to have the new .cjs extensions.



<br/>



### 3- Run the toesm command



Generate the ESM code into the targeted directory.



```shell

toesm.cmd --input="src/cjs/**/*.?(c)js" --output=src/esm/

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
    "gen:esm": "toesm.cmd --input=\"src/cjs/**/*.?(c)js\" --output=src/esm/"
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



### **Your module is now ready, and your user can do an install with**



```shell

npm install my-project
```



#### To use your library in Node:



```javascript

const {addSomething} = require("my-project");
```



#### In the Browser:



```javascript

import {addSomething} from "my-project";
```



But, this is not enough. Import with ES6 is not as slick as a simple "require()" in NodeJs. It does not have a

dedicated node_modules/ folder along with a package.json.



It has no idea where to find "my-project". ESM is expecting a relative path.



👉 _Note that this code will work when using a bundler as they know where to find that node_modules/ folder.

However, you're handling generated new code._



Users must reference the full path to your ESM entry point to use your ESM code.



```javascript

import addSomething from "../node_modules/my-project/src/esm/add.mjs"
```



**This is expected.** 👈



<br/><br/>



### External dependencies <a name="external"></a>



We can raise another issue:



In the browser environment, if your package uses external libraries, the browser may not be able to find them.



Let's use an example where you have a call to an external library called **"external-lib"**.


```javascript
// ...
const externalLb = require("external-lib");
// ...
```

When translated to ESM, the code will be like this:


```javascript
// ...
import externalLib from "external-lib";
// ...
```


We know that ESM in the browser is expecting a relative or absolute path.

So, it's very likely that you'll see this message:



😓  Uncaught TypeError: Failed to resolve module specifier "RGB-hex". Relative references must start with either "/", ".

/", or "../".



![img_1.png](https://github.com/thimpat/to-esm/blob/main/docs/images/img_1.png)



You will have to set the path to the **node_modules/** folder, and therefore have something like this:

```javascript
// ...
import externalLib from "./../node_modules/external-lib/index.js";
// ...
```



But this is not enough. You are referencing the path to your **node_modules/**. When your package is installed, your

**node_modules/** directory will disappear.



![img_2.png](https://github.com/thimpat/to-esm/blob/main/docs/images/img_2.png)



As you see in this example, there is no **node_modules/** in the deployed package. npm removes it automatically and

flattened it later.



Here is a likely resulting structure of an install:



```
User's project

   |_ node_modules       ← You want to point here

         |_ external-lib

              |_ index.js

              |_ package.json

              |_ your non-existing ~~node_modules~~      ← You're pointing here

```              



**You must reference the root directory.**



In this case, you will have to go two folders above. Giving us something like this:



```javascript
// ...
import externalLib from "../../../node_modules/external-lib/index.js";
// ...
```



But, this is not enough 😐



The entry point may not be index.js (and very likely will not be). You have to parse the package.json file.



To solve the dependency paths, use the option:


>
> --solvedep



The options --solvedep is not the default because the generated esm will point to a non-existing directory (The code

will not be bundler-bundable as some paths will be broken).



👉 **Ideally, your package would not use any external dependencies, and you'll avoid the trouble. However, in many cases, to circumvent,

you would

bundle your third parties and make them accessible within your package in a location different from node_modules/. Or

you would force npm to make your node_modules/ directory available.**



#### Using absolute path:



```javascript
// ...
import externalLib from "/node_modules/external-lib/index.js";
// ...
```



If you use the file protocol of Electron, /node_modules will point to the root directory on a Linux system or C:/

(ROOT_DRIVE_LETTER:/ ) or Windows. It's a protected path.


If you use this on a server, it will be the server root but, you have no guarantee that the node_modules/ is located there.



### Adding an importmap



To be able to write things like ```import {addSomething} from "my-project";```

on the browser side, you can define an import map.



In the targeted HTML file, set the path to your entry point:



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



Now, imports like



```javascript

import {addSomething} from "my-project";

```

are valid without bundler (or transpiler)

