// #!/usr/bin/env node

const {findPackageEntryPoint} = require("to-ansi");

const argv = minimist(process.argv.slice(2));

const init = (argv) =>
{
    const name = argv.name;
    const dirpath = argv.path;
    const target = argv.target;

    let isCjs = false, isModule = false, isBrowser = false;
    if (target === "browser")
    {
        isBrowser = true;
    }
    else if (target === "esm")
    {
        isModule = true;
    }
    else if (target === "cjs")
    {
        isCjs = true;
    }

    const entrypoint =
        findPackageEntryPoint(name, dirpath, {isCjs, isModule, isBrowser});

    if (!entrypoint)
    {
        console.log("No entrypoint detected on this module/path");
        return;
    }

    console.log(entrypoint);
};

init(argv);