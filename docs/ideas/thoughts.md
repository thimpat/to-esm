<span style="font-size:40px;">💡</span>

### Some thoughts !heading

When you bundle your code, you usually introduce code from other third parties. Therefore, it may create implicit code repetition. Tree shaking eliminates unnecessary code; however, it is done at "compile" time. This means it can not detect what has been repeated (Even though Tree shaking technics seem to go beyond simple dead code elimination).

Also, most IDEs detect the use of dead code, which IMO also mitigate tree shaking greatness.

For instance, let's say you use two libraries.
Lib1.js and Lib2.js.
> Lib1 uses lodash and has been minified into lib1.min.js
> Lib2 also uses lodash and has been minified into lib2.min.js.

When you bundle your code containing lib1.js and lib2.js, you add lodash two times (or some functions of it).

IMO, there are considerable advantages to not using bundled code.

> - 1- Letting the browser cache all shared libraries is one of them; therefore, having the best caching system
    > (Chrome or Firefox would surely know the best way to cache files coming from a common ground).
>
>
> - 2- Avoiding automated code repetition
>
>
> - 3- Less painful and lengthy wait when the codebase becomes enormous.
>
>
> - 4- Make Hot Reloading obsolete. Instead, use Cold Reloading (you reload when you save, when not the bundler has
    finished its compilation).
>
>
> - 5- Working directly on the "original code" rather than a defigured one (even using source maps sometimes may make
    the experience not fantastic).
>
>

### In any case, ideally, **you would only bundle your code during production.**


