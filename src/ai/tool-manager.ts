export interface Tool {
  name: string;
  execute(args: any): Promise<any>;
}

export class ToolManager {
  private tools: Record<string, Tool> = {};

  registerTool(name: string, tool: Tool) {
    this.tools[name] = tool;
  }

  async handleToolCall(name: string, args: any) {
    if (!this.tools[name]) throw new Error(`Tool '${name}' not registered`);
    return this.tools[name].execute(args);
  }

  getToolNames() {
    return Object.keys(this.tools);
  }
}