const consoleMethods = [
  "log",
  "debug",
  "info",
  "warn",
  "error",
  "assert",
  "table",
  "dir",
  "dirxml",
  "trace",
  "group",
  "groupCollapsed",
  "groupEnd",
  "count",
  "countReset",
  "time",
  "timeEnd",
  "timeLog",
  "profile",
  "profileEnd",
];

const redactConsoleArgument = (value, index) => {
  if (value instanceof Error) {
    return value.message;
  }
  if (typeof value === "string" && index === 0) {
    return value;
  }
  return "[data omitted]";
};

consoleMethods.forEach((method) => {
  const original = console[method];
  if (typeof original !== "function") return;

  console[method] = (...args) => {
    if (method === "assert") {
      const [condition, ...messageArgs] = args;
      if (condition) return;
      return original.call(
        console,
        false,
        ...messageArgs.map((value, index) => redactConsoleArgument(value, index))
      );
    }

    return original.apply(
      console,
      args.map((value, index) => redactConsoleArgument(value, index))
    );
  };
});
