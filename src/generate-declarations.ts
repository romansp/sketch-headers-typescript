import * as fs from "fs-extra";
import * as path from "path";

interface TypeInfo {
  type: SketchHeaders.API.HeaderType;  
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
    const type = (await fs.readJson(typeHeader)) as SketchHeaders.API.HeaderType;

    const info = typeInfo(type);
    file.write(`declare ${info.tsKind} ${type.className}${inheritance(info)} {${each(
        info.methods,
        method => `
  ${possiblyStatic(method)}${escapeMethodName(method.bridgedName)}(${extractArguments(method, info)}): ${convertType(method.returns, info)};`
      )}${each(toArray(type.properties), property => `
  ${property.name}(): ${convertType(property.type, info)};
  set${property.name}(${property.name}: ${convertType(property.type, info)}): void;`)}
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

function extractArguments(method: SketchHeaders.API.Method, typeInfo: TypeInfo) {
  return toArray(method.args)
    .map((arg, i) => `arg${i}: ${convertType(arg.type, typeInfo)}`)
    .join(", ");
}

const typesMap = {
  "BOOL": "boolean",
  
  "char": "string",
  "SEL": "string",

  "int": "number",
  "short": "number",
  "unsigned long long": "number",
  "unsigned int": "number",
  "long long": "number",
  "double": "number",
  "float": "number",

  "id": "any",
  "CDUnknownBlockType": "any",
  "OpaqueControlRef": "any",
  "OpaqueEventRef": "any",
  "OpaqueEventHandlerCallRef": "any",
  "OpaqueWindowPtr": "any"
};

function convertType(type: SketchHeaders.API.Type, typeInfo: TypeInfo) {
  let tsType = trimStart(type, "const ")
  tsType = trimStart(tsType, "in ");
  tsType = trimStart(tsType, "bycopy ");
  tsType = trimStart(tsType, "struct ");
  tsType = trimStart(tsType, "unsigned ");
  tsType = trimStart(tsType, "__weak ");
  tsType = trimStart(tsType, "nullable ");
  while (tsType.endsWith("*")) {
    tsType = trimEnd(tsType, "*");
  }
  tsType = trimEnd(tsType, " ");

  if (tsType.indexOf("<") != -1) {
    tsType = tsType.substring(0, tsType.indexOf("<"));
  }

  if (tsType == 'instancetype') {
    return typeInfo.type.className;
  }

  const mappedType = typesMap[tsType];
  if (mappedType) {
    return mappedType;
  }
  return tsType;
}

var macros = [
  'NS_DEPRECATED',
  'NS_DESIGNATED_INITIALIZER',
  'NS_RETURNS_INNER_POINTER',
  'NS_AVAILABLE',
  'NS_AUTOMATED_REFCOUNT_UNAVAILABLE',
  'NS_SWIFT_UNAVAILABLE',
];

function shouldSkipMethod(method: SketchHeaders.API.Method): boolean {
  for (const macro of macros) {
    const hasMacro = method.bridgedName.indexOf(macro) != -1;
    if (hasMacro) {
      return true;
    };
  }
  return false;
}

function typeInfo(type: SketchHeaders.API.HeaderType): TypeInfo {
  const methods = toArray(type.methods).filter(method => !shouldSkipMethod(method));
  
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

const SKETCH_HEADERS_API = path.join(__dirname, '../../sketch-headers/headers');
const OUTPUT_PATH = "./dist";

export async function generateAll() {
  await generate(`${SKETCH_HEADERS_API}/sketch`, `${OUTPUT_PATH}/sketch-headers.d.ts`);
  await generate(`${SKETCH_HEADERS_API}/macos`, `${OUTPUT_PATH}/macos-headers.d.ts`);
}

generateAll();
