import * as http from "http";
import * as fs from "fs-extra";
import * as path from "path";

const OUTPUT_PATH = "./dist";

interface TypeInfo {
  type: SketchHeaders.API.Type;  
  methods: SketchHeaders.API.Method[];
  tsKind: "interface" | "class";
}

export async function generate(baseUri: string, output: string) {
  const index = `${baseUri}/index.json`;

  const entries = (await fs.readJson(index)) as string[];
  await fs.ensureFile(output)
  const file = fs.createWriteStream(output);

  for (let entry of entries) {
    // some entries are bugged and have line breaks in the end.
    entry = encodeURIComponent(entry);
    let typeHeader = `${baseUri}/${entry}.json`;

    console.log(entry);
    const type = (await fs.readJson(typeHeader)) as SketchHeaders.API.Type;

    const info = typeInfo(type);
    file.write(`declare ${info.tsKind} ${type.className}${inheritance(info)} {${each(
        toArray(type.methods),
        method => `
  ${possiblyStatic(method)}${escapeMethodName(method.bridgedName)}(${extractArguments(method)}): ${convertType(method.returns)};`
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

function typeInfo(type: SketchHeaders.API.Type): TypeInfo {
  const methods = toArray(type.methods);
  return {
    methods,
    tsKind: methods.some(method => method.kind == "instance") ? "class" : "interface",
    type,
  };
}

function classOrInterface(typeInfo: TypeInfo) {
  return "class";
}

function inheritance(typeInfo: TypeInfo) {
  const type = typeInfo.type;
  let inheritance = [];
  if (type.extends) {
    inheritance.push(type.extends);
  }
  inheritance = [...inheritance, ...type.interfaces];
  return inheritance.length > 0 ? ` extends ${inheritance.join(', ')}` : "";
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

const SKETCH_HEADERS_API = path.join(__dirname, '../../sketch-headers/latest/');

export async function generateAll() {
  await generate(`${SKETCH_HEADERS_API}`, `${OUTPUT_PATH}/sketch-headers.d.ts`);
 // await generate(`${SKETCH_HEADERS_API}`, `${OUTPUT_PATH}/macos-headers.d.ts`);
}

generateAll();
