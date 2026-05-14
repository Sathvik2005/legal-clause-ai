declare module 'pdf-parse' {
  type PdfParseResult = {
    text?: string
  }

  type PdfParse = (buffer: Buffer) => Promise<PdfParseResult>

  const pdfParse: PdfParse
  export default pdfParse
}