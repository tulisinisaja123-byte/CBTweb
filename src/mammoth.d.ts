declare module 'mammoth' {
  interface MammothResult {
    value: string;
    messages: any[];
  }

  interface MammothOptions {
    arrayBuffer?: ArrayBuffer;
    buffer?: Buffer;
    path?: string;
  }

  export function convertToHtml(input: MammothOptions): Promise<MammothResult>;
  export function extractRawText(input: MammothOptions): Promise<MammothResult>;
}
