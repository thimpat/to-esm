<span style="font-size:40px;">💡</span>
## Write code for CommonJs and ES Modules


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

Or, providing a default export too:

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
