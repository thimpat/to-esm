const EOL =`
`;

/** to-esm-all: skip **/
console.log("Skip this 3");
/** to-esm-all: end-skip **/


class Example
{
    constructor()
    {
        console.log("Hello you!");
    }

    start()
    {
        console.log("I'm ready")
    }
}

module.exports = new Example();
module.exports.example = new Example();
