<span style="font-size:40px;">💡</span>

## Working with both CJS and ESM !heading

You may want to work with both CommonJs and ESM together. So, you benefit from both worlds.

The CommonJs approach is a dynamic one. So, for example, you can do things like:

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

<br/><br/>
