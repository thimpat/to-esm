<span style="font-size:40px;">📋</span>

#### Generate code into a dedicated directory !heading

> --output < folder >

```shell
# 💻 < Command
$> to-esm  example/cjs/input.cjs --output generated/esm
```

---


###### Click on the arrow to expand or collapse
<details><summary><strong>⏳ Before...</strong></summary>

```
📁project                 ⇽ Ran from here
│
└───📁example
│   │
│   └───📁code
│       │   📝 library.js
│       │   📝 demo.js   ⇽ 🚩
│       │   ...
```
</details>
<br/>



<details><summary><strong>⌛ After...</strong></summary>

```
📁project                 
│
└───📁example
│   │
│   └───📁code
│       │   📝 library.js
│       │   📝 demo.js   
│       │   ...
│
└───📁generated                   ⇽ 🚩
│   └───📁esm
│       └───📁example   
│           └───📁code
│                  📝 library.mjs ⇽ 🚩
│                  📝 demo.mjs    ⇽ 
│                   ...
```

</details>

<br/>

<details><summary><strong>⌛ Check...</strong></summary>

##### Checking the conversion has succeeded

```shell
node generated/esm/example/code/demo.mjs
```

</details>

