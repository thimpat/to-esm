module.exports = {
    env: {
        browser: true,
        node: true
    },
    parserOptions: {
        "ecmaVersion": 2022
    },
    "ignorePatterns": ["example/**/*.*"],
    rules: {
        "comma-dangle": 0,
        "comma-style": ["error", "last"],
        "no-bitwise": "off",
        "no-console": "off",
        "no-nested-ternary": "off",
        "no-plusplus": "off",
        "prefer-const": "off",
        "spaced-comment": "off",
        "no-debugger": "error",
        "quotes": ["error", "double", { "avoidEscape": true, "allowTemplateLiterals": true }],
        "semi": 2,
        "no-unused-vars": "error",
        "max-len": ["error", {code: 200}]
    }
};
