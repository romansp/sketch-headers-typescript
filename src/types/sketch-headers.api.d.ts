declare namespace SketchHeaders.API {
  interface Type {
    imports: string[];
    classes: string[];
    protocol: boolean;
    className: string;
    extends: string;
    interfaces: string[];
    methods: { [methodName: string]: Method };
  }

  interface Method {
    name: string,
    bridgedName: string,
    args: { [argName: string]: Argument };
    returns: string,
    kind: "instance" | "class",
    kindIndicator: "+" | "-"
  }

  interface Argument {
    type: ArgumentType;
  }

  type ArgumentType = string;
}
