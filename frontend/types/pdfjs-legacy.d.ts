declare module 'pdfjs-dist/legacy/build/pdf' {
  const pdfjs: {
    GlobalWorkerOptions: { workerSrc: string };
    getDocument: (src: { data: ArrayBuffer }) => { promise: Promise<{ numPages: number }> };
  };
  export = pdfjs;
}
