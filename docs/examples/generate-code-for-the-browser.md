<span style="font-size:40px;">📋</span>


#### Generate code for the browser !heading

> **--target** < **browser** | esm | all >

```shell
# Command < 💻
$> to-esm  example/cjs/input.cjs --output generated --target browser
```
---



###### Click on the arrow to expand or collapse
<details><summary><strong>You see a warning when using node native module within the browser</strong></summary>

#### 1- When generating code for the browser, **to-esm** will display a warning when the code uses a native Node library.



📝 _demo.js_ ↴
```javascript
const path = require("path");                   // See directives below to see how to remove this call
function hi()
{
    console.log(`I wanted to say hi!`)
}

module.exports = hi;
```


###### During conversion:
```shell
💻 >
to-esm: (1130) ================================================================
to-esm: (1132) Processing: ./example/code/demo.js
to-esm: (1134) ----------------------------------------------------------------
to-esm: (1060) ✔ SUCCESS: Converted [./example/code/demo.js] to [generated-browser\demo.mjs]
to-esm: (1150) 
to-esm: (1130) ================================================================
to-esm: (1132) Processing: ./example/code/library.js
to-esm: (1134) ----------------------------------------------------------------
to-esm: (1017) path is a built-in NodeJs module. ⇽ 🚩
to-esm: (1060) ✔ SUCCESS: Converted [./example/code/library.js] to [generated-browser\example\code\library.mjs]
to-esm: (1150) 

```


#### 2- To load your files in the HTML code, you only point to the entry file (demo.js).

The browser will automatically load the other files.

![img.png](docs/images/img_3.png)

> **demo.mjs** is the entrypoint.

All of the related files are automatically loaded by the browser.
<br/>

</details>

---

###### Click on the arrow to expand or collapse

<details><summary><strong>NodeJs Third Party modules in browser</strong></summary>


When there is a requirement to load libraries from the node_modules folder,
to-esm will generate a converted copy of the files to the output directory.

📝 _demo.js_ ↴
```javascript
const toAnsi = require("to-ansi");
const rgbHex = require("rgb-hex-cjs");
const {COLOR_TABLE, SYSTEM} = require("./some-lib.js");
// ...
```

```
📁project  
└─── 📁 original  
     │─── 📝 index.html
     │─── 📝 demo.js
     │─── 📝 some-lib.js
     │
     └─── 📁 generated  
           │─── 📝 demo.mjs             ⬅ 🚩
           │─── 📝 some-lib.mjs         ⬅ 🚩
           │
           └─── 📁 node_modules         ⬅ 🚩
               │
               └───📁 rgb-hex
               │   └── 📝 index.js
               │     
               └───📁 to-ansi
                   └── 📝 index.js 
                         
```

The two libraries used will be easily accessible by the system and ease the bundling in production.
See the importmap section to have a more modular approach.


</details>

