<span style="font-size:40px;">💡</span>

## Create a Hybrid Library with to.esm supporting the browser !heading


<br><br>




### 1- Use .cjs extensions instead of .js

```
📁project  
└─── 📝 index.cjs                ⬅ 🚩
└─── 📝 package.json
└─── 📁example
│    │
│    └───📁code
│        └───   📝 library.cjs   ⇽ 🚩
│               ...
│
└─── 📁 node_modules
│    └── ...
         
```


<br/>



### 2- Run to-esm against the entry point

```shell
$> to-esm --entrypoint index.cjs --output ./generated --update-all --target browser --bundle index.min.cjs
```

> 🚫
_If you are not targeting the browser, ignore --target and --bundle options_
> ```shell
> $> to-esm --entrypoint index.cjs --update-all
> ```

> 🚫
_It is possible that my bundling implementation fails (I haven't seen it fail yet). It's five hours of work, so it's
> likely
> not perfect. You can use an external bundler like Rollup, for instance, to bundle your final work_
> ```shell
> $> npm install rollup -g
> $> rollup ./generated/index.cjs --file index.min.js --format iife
> ```
> 
---



###### Click on the arrow to expand or collapse
<details><summary><strong>⏳ Before...</strong></summary>

📝 ./package.json ↴
```json
{
  "name": "my-project",
  "main": "./index.cjs",
  "scripts": {
    "build": "to-esm --entrypoint index.cjs"
  },
  "devDependencies": {
    "to-esm": "file:.."
  }
}
```

📝 ./index.cjs ↴
```javascript
const hi = require("./example/code/library.cjs");
hi();
```

📝 ././example/code/library.cjs ↴
```javascript
function hi()
{
    console.log(`I wanted to say hi!`)
}

module.exports = hi;
```

</details>

---

<details><summary><strong>⌛ After...</strong></summary>

📝 **./package.json** ↴ _(Updated because of the --update-all option)_
```json
{
  "name": "my-project",
  "main": "./index.cjs",
  "scripts": {
    "build": "to-esm --entrypoint index.cjs"
  },
  "devDependencies": {
    "to-esm": "file:.."
  },
  "module": "./index.mjs",
  "type": "module",
  "exports": {
    ".": {
      "require": "./index.cjs",   // ⬅ 
      "import": "./index.mjs"     // ⬅ 
    }
  }
}

```


📝 ./index.mjs ↴
```javascript
/**
 * DO NOT EDIT THIS FILE DIRECTLY.
 * This file is generated following the conversion of
 * [./index.cjs]{@link ./index.cjs}
 *
 **/
import hi  from "./example/code/library.mjs";
hi();
```

📝 ././example/code/library.mjs ↴
```javascript
/**
 * DO NOT EDIT THIS FILE DIRECTLY.
 * This file is generated following the conversion of
 * [./example/code/library.cjs]{@link ./example/code/library.cjs}
 *
 **/
function hi()
{
    console.log(`I wanted to say hi!`)
}

export default hi;
```

📝 **./dist/index.min.js** ↴ (Generated because of the --bundle option)
```javascript
const c={"95c93":{}};c["95c93"].default=function(){console.log("I wanted to say hi!")};{c.bbc7e={};let b=c["95c93"].default;b()}
```


</details>

---

<br/>



### 3- Your code is generated.

```
📁project  
└─── 📝 index.cjs                
└─── 📝 package.json
└─── 📁generated                 
│    │
│    └─── 📝 index.mjs          ⬅ 🚩
│    │     
│    └─── 📝 ...
│
└─── 📁 dist         
│    └── index.min.js           ⬅ 🚩
         
```

##### Insert the standard JavaScript version

```html
...
<body>
<script type="module" src="generated/index.mjs"></script>      ⬅ 🚩    
</body>
...
```

##### or the bundled version into your HTML

```html
...
<body>
<script type="module" src="dist/index.min.mjs"></script>      ⬅ 🚩    
</body>
...
```