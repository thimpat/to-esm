<span style="font-size:40px;">π</span>

#### Generate code into a dedicated directory !heading

> --output < folder >

```shell
# π» < Command
$> to-esm  example/cjs/input.cjs --output generated/esm
```

---


###### Click on the arrow to expand or collapse
<details><summary><strong>β³ Before...</strong></summary>

```
πproject                 β½ Ran from here
β
ββββπexample
β   β
β   ββββπcode
β       β   π library.js
β       β   π demo.js   β½ π©
β       β   ...
```
</details>
<br/>



<details><summary><strong>β After...</strong></summary>

```
πproject                 
β
ββββπexample
β   β
β   ββββπcode
β       β   π library.js
β       β   π demo.js   
β       β   ...
β
ββββπgenerated                   β½ π©
β   ββββπesm
β       ββββπexample   
β           ββββπcode
β                  π library.mjs β½ π©
β                  π demo.mjs    β½ 
β                   ...
```

</details>

<br/>

<details><summary><strong>β Check...</strong></summary>

##### Checking the conversion has succeeded

```shell
node generated/esm/example/code/demo.mjs
```

</details>

