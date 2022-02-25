<span style="font-size:40px;">💡</span>
## Some conventions to write code for both CommonJs and ES Modules

Here are a few guides to writing code easily convertible.


### Use named exports

For having the best compatibility between the two systems, it is best to use named exports.


Replace structure like:

```javascript

module.exports = {
    TABLE1: ...,
    TABLE2: ...,
    otherKey: ...
}
```

with:

```javascript

module.exports.TABLE1 = ...;
module.exports.TABLE2 = ...;
module.exports.otherKey = ...;
```

Or, if you want to provide a default export too:

```javascript
// Default export
module.exports = {
    TABLE1, TABLE2, ...
}

// Named export
module.exports.TABLE1 = ...;
module.exports.TABLE2 = ...;
module.exports.otherKey = ...;
```


### Use simple "require"

Rather than using requires like below (or more complex forms)

🤏 ↴
```javascript
const Something = require("electron-data-exchanger").myThing;
const anything = require("electron-data-exchanger")(...);
```

Which may introduce temporary variables (_toesmTemp1)

```javascript
import _toesmTemp1  from "electron-data-exchanger";
const Something = _toesmTemp1.myThing;
```

It is best to have them uncomplicated, so the conversion is straightforward

<span style="font-size:18px;">👍</span> ↴
```javascript
const MySomething = require("electron-data-exchanger");
const myAnything = require("electron-data-exchanger");

// ... The code that uses what was required
```

