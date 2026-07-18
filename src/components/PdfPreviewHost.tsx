import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { subscribePdfPreview, PdfPreviewPayload } from "@/lib/pdfPreview";

const PdfPreviewHost = () => {
  const [payload, setPayload] = useState<PdfPreviewPayload | null>(null);

  useEffect(() => {
    return subscribePdfPreview((p) => setPayload(p));
  }, []);

  const handleClose = (open: boolean) => {
    if (!open) {
      if (payload?.blobUrl) URL.revokeObjectURL(payload.blobUrl);
      setPayload(null);
    }
  };

  const handleDownload = () => {
    if (!payload) return;
    const a = document.createElement("a");
    a.href = payload.blobUrl;
    a.download = payload.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={!!payload} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl w-[95vw] h-[92vh] p-0 flex flex-col gap-0">
        <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <div className="min-w-0">
            <DialogTitle className="truncate">Visualização do PDF</DialogTitle>
            <DialogDescription className="truncate text-xs">
              {payload?.filename}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Baixar PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleClose(false)} className="gap-1">
              <X className="h-4 w-4" />
              Fechar
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 bg-muted overflow-hidden">
          {payload && (
            <iframe
              src={payload.blobUrl}
              title="Pré-visualização do PDF"
              className="w-full h-full border-0"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PdfPreviewHost;
