<span style="font-size:40px;">💡</span>

## Working with both CJS and ESM

You may want to work with both CommonJs and ESM together. So, you benefit from both world.

The CommonJs approach is a dynamic one. You can do things like:

```javascript
if (a)
{
    // load module a
    require(a);
}
else
{
    // load module b
    require(b)
}
```

With ESM and its static approach, loading both modules is necessary.
```javascript
    // load module a
    import "a";
    // load module b
    import "b";
```


JavaScript being a dynamic language, the usage of Cjs still does make sense.


<br/><br/><br/>

---

<br/><br/>

## 💡

## Write code for CommonJs and ES Modules


### Use named exports

For having best compatibility between the two systems, prefer using named exports.


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
