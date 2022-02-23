<span style="font-size:40px;">📋</span>

#### Generate ESM code !heading

To generate an **.mjs**(ES module) file from a **.js** file do:

---

```shell
# 💻 < Command
$> to-esm  example/cjs/input.js
```

> 🚫
> **NOTE: to-esm should run from the project root folder.**


---


###### Click on the arrow to expand or collapse

<details><summary><strong>⏳  Before...</strong></summary>

```
📁project                 ⇽ Ran from here
│
└───📁example
│   │
│   └───📁code
│       │   📝 library.js
│       │   📝 demo.js   ⇽
│       │   ...
│
```

📝 _library.js_ ↴
```javascript
function hi() 
{
    console.log(`I wanted to say hi!`)
}
module.exports = hi;
```

📝 _demo.js_ ↴
```javascript
const hi = require("./library.js");
hi();
```

**./demo.js => ./demo.mjs 📝**

</details>
<br/>




<details><summary><strong>⌛ After...</strong></summary>

```
📁project
│
└───📁example
│   │
│   └───📁code
│       │   📄 library.js
│       │   📄 demo.js
│       │   📝 library.mjs   ⇽
│       │   ...
│
└ 📝 demo.mjs     ⇽
```

📝 _library.js_ ↴
```javascript
function hi()
{
    console.log(`I wanted to say hi!`)
}

export default hi;
```

📝 _demo.js_ ↴
```javascript
import hi  from "./example/code/library.mjs";
hi();
```

to-esm will convert the entry point inside the working
directory. The others will depend on the source location.

</details>

