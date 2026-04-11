/**
 * ANSI escape code to HTML converter.
 * Used by the Cursor stdio MCP server to pre-render tool output as an
 * HTML MCP App iframe.
 */
export declare const ANSI_TO_CSS: Record<string, string>;
export declare function ansiToHtml(text: string): string;
export declare function buildAppHtml(ansiContent: string): string;
//# sourceMappingURL=ansi-to-html.d.ts.map