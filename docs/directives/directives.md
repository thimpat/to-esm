<span style="font-size:40px;">💉</span>

## Directives !heading

<br/>

#### Directives allow more control over the generated code.

<br/>

---

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

<br>

---


### Directives to add code to the source.

It is also possible to add code.

📝 code.cjs ↴
```javascript
/** to-esm-browser: add
    this.realConsoleLog("LogToFile is not supported in this environment. ")
 **/
```

In this example, after conversion, the above code will become this:

📝 code.mjs (with target browser) ↴
```javascript
this.realConsoleLog("LogToFile is not supported in this environment. ")
```

<br>

---


### Directives to ignore code during the parsing, so it won't be converted by mistake.

```javascript
/** to-esm-all: skip **/
console.log("Skip this");
/** to-esm-all: end-skip **/
```

<br>

---


### Directives to keep the target file as it is.

```javascript
/** to-esm-all: do-not-overwrite **/
```

If the .mjs file already exists and contains this directive, it will not be overwritten.
