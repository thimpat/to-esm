
### Named Export Long Explanation


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



<br><br><br><br>

----
**_From this point, everything below is informative and can be skipped._**
