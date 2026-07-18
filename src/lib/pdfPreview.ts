import type jsPDF from "jspdf";

export interface PdfPreviewPayload {
  blobUrl: string;
  filename: string;
}

const EVENT_NAME = "pdf-preview:open";

export function openPdfPreview(pdf: jsPDF, filename: string) {
  const blob = pdf.output("blob");
  const blobUrl = URL.createObjectURL(blob);
  window.dispatchEvent(
    new CustomEvent<PdfPreviewPayload>(EVENT_NAME, {
      detail: { blobUrl, filename },
    })
  );
}

export function subscribePdfPreview(handler: (payload: PdfPreviewPayload) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<PdfPreviewPayload>).detail);
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
