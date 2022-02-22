<span style="font-size:40px;">💎</span>

## Advanced Options (via config file) !heading



To apply advanced options, create a config file and make the CLI point to it.

```shell
to-esm --config=.to-esm.cjs
```



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

| **Properties**       | **Description**                                                       | 
|----------------------|-----------------------------------------------------------------------|
| replaceStart         | _will perform a replacement **_before_** doing the conversion to ESM_ |
| replaceEnd           | _will perform a replacement **_after_** doing the conversion to ESM_  |
| replaceStart.search  | _The regex pattern or string to replace_                              |
| replaceStart.replace | _The replacement sentence_                                            |


<br><br>





### Options to use two different modules of the same library.


> "replaceModules": ...

Sometimes, you may find libraries where only ESM is available when CJS was available on older versions.

This option allows setting a different version depending on the environment used.

For instance, the module "chalk" uses ESM for its Export on its latest version (5.0.0) and CJS for the older version (4.

1.2).

You can setup toesm to use the appropriate version:



📝 .toesm.cjs ↴

```javascript
module.exports = {
    replaceModules:
        {
            "rgb-hex":
                {
                    cjs: {
                        name   : "rgb-hex-cjs",             // ⬅ 🚩 .cjs files will use 
                                                            // ... = require("rgb-hex-cjs")  
                                                            // to load the module (v3.0.0)
                        version: "@^3.0.0"
                    },
                    esm: {
                        version: "@latest"                  // ⬅ 🚩 .mjs files will use
                                                            // import ... from "rgb-hex"
                                                            // to load the module
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
import rgbhex  from "rgb-hex";
```

---

| **Properties**                    | **Description**                                         | 
|-----------------------------------|---------------------------------------------------------|
| replaceModules[\<moduleName>]     | _The module we want to use two different versions with_ |
| replaceModules[\<moduleName>].cjs | _The module version to use with CommonJs files_         |
| replaceModules[\<moduleName>].mjs | _The module version to use with converted files_        |



<br><br>


### Options to set html sources and manipulate importmaps.

> "html": ...

```javascript
module.exports = 
{
    html :
        {
            pattern: "/index.html",
            importmap       : 
            {
                    "my-project": "../node_modules/my-project/src/esm/add.mjs",
                    "lodash": "https://cdn.jsdelivr.net/npm/lodash@4.17.10/lodash.min.js"
            },
            importmapReplace: [{
                search : "./node_modules",
                replace: `/node_modules`,
            }],
        }
}
```


| **Properties**   | **Description**                                    | 
|------------------|----------------------------------------------------|
| pattern          | _HTML file pattern where importmap needs updating_ |
| importmap        | _value to add to html files_                       |
| importmapReplace | _Apply replacements on the importmap list_         |


<br/><br/>



###### The options above will be deployed as below:


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
Allowing to write this:

```javascript
import {add} from "my-project"
```

> 🚫
> **NOTE: All of the caching is handled by the browser. You only bundle your code.**

 