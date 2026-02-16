declare module "xlsx-populate" {
  namespace XlsxPopulate {
    interface Workbook {
      sheet(name?: string | number): Sheet;
      outputAsync(type?: string): Promise<Blob | ArrayBuffer>;
    }

    interface Sheet {
      name(name?: string): string | Sheet;
      cell(address: string): Cell;
      range(ref: string): Range;
      column(ref: string | number): any;
      row(index: number): any;
      freezePanes(row: number, col: number): Sheet;
      pageSetup(setup?: any): any;
      usedRange(): Range;
      printGridlines?(value: boolean): Sheet;
      showGridLines?(value: boolean): Sheet;
    }

    interface Cell {
      value(v?: any): any;
      style(s?: any): any;
      comment(c?: any): any;
    }

    interface Range {
      merged(v?: boolean): any;
      style(s?: any): any;
      value(v?: any): any;
    }

    function fromBlankAsync(): Promise<Workbook>;
  }

  const XlsxPopulate: typeof XlsxPopulate;
  export = XlsxPopulate;
}
