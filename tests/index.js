import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const { registerHooks } = require("node:module");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      context.parentURL?.includes("/src/lib/") &&
      specifier.startsWith(".") &&
      !specifier.endsWith(".ts")
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

require("./logic.js");
require("./data.js");
