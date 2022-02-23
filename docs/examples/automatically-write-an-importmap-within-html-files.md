<span style="font-size:40px;">📋</span>

####  Generate some importmap within html files !heading

> --html < pattern | html >

```shell
# Generates => 📝 ./demo.mjs & update index.html
$> to-esm example/cjs/demo.cjs --html index.html
```

---

###### An import map will allow writing imports like this

```javascript
import rgbhex from "rgb-hex"
```


###### instead of

```javascript
import rgbhex from "../../../path/to/rgb-hex.mjs"
```

---

###### Click on the arrow to expand or collapse
<details><summary><strong>HTML importmap section</strong></summary>




###### Before
📝 index.html ↴
```html
<!DOCTYPE html>
<html lang="en">
<head>
</head>
<body>
<script type="module" src="actual/demo-test.mjs"></script>
</body>
</html>
```

###### After
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script type="importmap">
        {
          "imports": {
            "rgb-hex": "./node_modules/rgb-hex/index.js"
          }
        }
    </script>
</head>
<body>
<script type="module" src="actual/demo-test.mjs"></script>
</body>
</html>
```

</details>

---

importmap allows some more elaborated setups where third party caching will be entirely handled by the browser.

