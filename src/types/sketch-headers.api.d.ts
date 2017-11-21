declare namespace SketchHeaders.API {
  interface HeaderType {
    imports: string[];
    classes: string[];
    protocol: boolean;
    className: string;
    extends: string;
    interfaces: string[];
    methods: { [methodName: string]: Method };
    properties: { [propertyName: string]: Property };
  }

  interface Method {
    name: string,
    bridgedName: string,
    args: { [argName: string]: MethodArgument };
    returns: string,
    kind: MethodKind,
    kindIndicator: MethodKindIndicator
  }

  interface MethodArgument {
    type: Type;
  }

  type Type = string;
  type MethodKind = "instance" | "class";
  type MethodKindIndicator = "+" | "-";

  interface Property {
    name: string;
    pointer: boolean;
    type: Type;
    attributes: string[];
  }
}
