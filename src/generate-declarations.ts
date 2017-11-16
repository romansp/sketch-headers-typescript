import * as http from "http";
import * as fs from "fs";
import * as rp from "request-promise";
import { method } from "bluebird";

export default async function generate() {
  const baseUrl = "https://skpm.github.io/sketch-headers/latest/sketch";
  const indexUrl = `${baseUrl}/index.json`;

  const opts: rp.Options = {
    uri: indexUrl,
    json: true,
    followAllRedirects: true
  };

  const entries = (await rp(opts)) as string[];
  const file = fs.createWriteStream("./dist/sketch-headers.d.ts");

  for (let entry of entries) {
    if (entry.endsWith("\n-")) {
      entry = entry.substring(0, entry.indexOf("\n-")) + "%250A-";
    }
    let typeUrl = `${baseUrl}/${entry}.json`;
    opts.uri = typeUrl;
    const type = (await rp(opts)) as SketchHeaders.API.Type;

    file.write(`
${classOrInterface(type)} ${type.className} {${each(
      toArray(type.methods),
      method => `
  ${possiblyStatic(method)}${escapeMethodName(method.bridgedName)}(${extractArguments(
        method
      )}): ${convertType(method.returns)};`
    )}
}
`);
  }

  file.close();
}

function toArray<T>(object: { [key: string]: T }) {
  return Object.keys(object).map(i => object[i]);
}

function each<T>(values: T[], formatter: (element: T) => string): string {
  if (values.length > 0) {
    return values.map(formatter).reduce((a, b) => a + b, "");
  }
  return "";
}

function escapeMethodName(methodName: string) {
  // handle .cxx_destruct method
  if (methodName.startsWith(".")) {
    return `"${methodName}"`;
  }
  return methodName;
}

function extractArguments(method: SketchHeaders.API.Method) {
  return toArray(method.args)
    .map((arg, i) => `arg${i}: ${convertType(arg.type)}`)
    .join(", ");
}

function convertType(type: SketchHeaders.API.ArgumentType) {
  let tsType = trimStart(type, "struct ");
  tsType = trimEnd(tsType, " *");
  if (tsType == "BOOL") {
    return "boolean";
  }
  if (tsType == "id") {
    return "any";
  }
  if (tsType == "char") {
    return "string";
  }
  if (tsType == "SEL") {
    return "string";
  }
  if (tsType == "unsigned long long") {
    return "number";
  }
  if (tsType == "long long") {
    return "number";
  }
  if (tsType == "double") {
    return "number";
  }
  return tsType;
}

function classOrInterface(type: SketchHeaders.API.Type) {
  return toArray(type.methods).some(method => method.kind == "instance") ? "class" : "interface";
}

function possiblyStatic(method: SketchHeaders.API.Method) {
  return method.kind == "class" ? "static " : "";
}

function trimStart(source: string, subStr: string) {
  if (source.startsWith(subStr)) {
    return source.slice(subStr.length);
  }
  return source;
}

function trimEnd(source: string, subStr: string) {
  if (source.endsWith(subStr)) {
    return source.substring(0, source.indexOf(subStr));
  }
  return source;
}

generate();
