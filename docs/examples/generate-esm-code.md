<span style="font-size:40px;">π</span>

#### Generate ESM code !heading

To generate an **.mjs**(ES module) file from a **.js** file do:

---

```shell
# π» < Command
$> to-esm  example/cjs/input.js
```

> π«
> **NOTE: to-esm should run from the project root folder.**


---


###### Click on the arrow to expand or collapse

<details><summary><strong>β³  Before...</strong></summary>

```
πproject                 β½ Ran from here
β
ββββπexample
β   β
β   ββββπcode
β       β   π library.js
β       β   π demo.js   β½
β       β   ...
β
```

π _library.js_ β΄
```javascript
function hi() 
{
    console.log(`I wanted to say hi!`)
}
module.exports = hi;
```

π _demo.js_ β΄
```javascript
const hi = require("./library.js");
hi();
```

**./demo.js => ./demo.mjs π**

</details>
<br/>




<details><summary><strong>β After...</strong></summary>

```
πproject
β
ββββπexample
β   β
β   ββββπcode
β       β   π library.js
β       β   π demo.js
β       β   π library.mjs   β½
β       β   ...
β
β π demo.mjs     β½
```

π _library.js_ β΄
```javascript
function hi()
{
    console.log(`I wanted to say hi!`)
}

export default hi;
```

π _demo.js_ β΄
```javascript
import hi  from "./example/code/library.mjs";
hi();
```

to-esm will convert the entry point inside the working
directory. The others will depend on the source location.

</details>

