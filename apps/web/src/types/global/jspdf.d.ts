declare module 'jspdf' {
  export class jsPDF {
    constructor(...args: any[]);
    addImage(...args: any[]): any;
    addPage(...args: any[]): any;
    save(...args: any[]): any;
    output(...args: any[]): any;
    internal: any;
    [key: string]: any;
  }
}
