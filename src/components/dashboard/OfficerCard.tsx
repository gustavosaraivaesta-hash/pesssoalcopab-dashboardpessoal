import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface PersonnelRecord {
  id: string;
  neo: number | string;
  tipoSetor: string;
  setor: string;
  cargo: string;
  postoTmft: string;
  corpoTmft: string;
  quadroTmft: string;
  opcaoTmft: string;
  postoEfe: string;
  corpoEfe: string;
  quadroEfe: string;
  opcaoEfe: string;
  nome: string;
  ocupado: boolean;
  om: string;
}

interface OfficerCardProps {
  item: PersonnelRecord;
  index: number;
  keyPrefix: string;
  variant?: "blue" | "green" | "purple" | "red" | "orange";
}

const OfficerCard = ({ item, index, keyPrefix, variant = "blue" }: OfficerCardProps) => {
  // Check if quadro TMFT and quadro EFE are different (this determines FORA DA NEO)
  const quadroTmftNorm = (item.quadroTmft || '').trim().toUpperCase();
  const quadroEfeNorm = (item.quadroEfe || '').trim().toUpperCase();
  const isDifferentQuadro = item.ocupado && quadroTmftNorm && quadroEfeNorm && quadroTmftNorm !== quadroEfeNorm;
  
  // Highlight only if quadro is different (corpo difference alone is not FORA DA NEO)
  const isDifferentNeoEfe = isDifferentQuadro;

  // Format military name: graduação-especialidade nome
  const formatMilitarName = () => {
    if (!item.nome || item.nome.toUpperCase() === 'VAGO') return "VAGO";

    const gradRaw = (item.ocupado ? item.postoEfe : item.postoTmft) || item.postoEfe || item.postoTmft || "";
    const espRaw = (item.ocupado ? item.quadroEfe : item.quadroTmft) || item.quadroEfe || item.quadroTmft || "";

    const grad = String(gradRaw).trim().toUpperCase();
    const esp = String(espRaw).trim().toUpperCase();
    const nomeCompleto = item.nome;
    
    // Ignore invalid esp values like "-", "QPA", "CPA", "QAP", "CAP", "PRM", etc.
    const isValidEsp = esp && esp !== "-" && !["QPA", "CPA", "QAP", "CAP", "CATP", "PRM", "CPRM", "QFN", "CFN"].includes(esp);

    if (!grad) return nomeCompleto;
    return `${grad}${isValidEsp ? `-${esp}` : ""} ${nomeCompleto}`;
  };

  const getCardBackground = () => {
    if (isDifferentNeoEfe) return "bg-amber-50 border-amber-400 border-2";
    if (item.tipoSetor === "EXTRA LOTAÇÃO") return "bg-orange-100/50 border-orange-200";
    if (!item.ocupado) return "bg-red-100/50 border-red-200";
    return "bg-green-100/50 border-green-200";
  };

  const getNeoVariantColor = () => {
    switch (variant) {
      case "green": return "bg-green-600 text-white border-green-600";
      case "purple": return "bg-purple-600 text-white border-purple-600";
      case "red": return "bg-red-600 text-white border-red-600";
      case "orange": return "bg-orange-500 text-white border-orange-500";
      default: return "bg-blue-600 text-white border-blue-600";
    }
  };

  return (
    <div
      key={`${keyPrefix}-${index}`}
      className={`p-3 border rounded-lg ${getCardBackground()}`}
    >
      {/* Top badges row - TMFT data */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {item.neo && String(item.neo).trim() !== '' && String(item.neo) !== '0' && (
          <Badge variant="outline" className="bg-white border-gray-300 text-gray-700 text-xs font-semibold">
            NEO {item.neo}
          </Badge>
        )}
        {item.postoTmft && (
          <Badge variant="outline" className="bg-white border-gray-300 text-gray-700 text-xs font-medium">
            {item.postoTmft}
          </Badge>
        )}
        {item.quadroTmft && item.quadroTmft !== "-" && (
          <Badge variant="outline" className="bg-green-500 text-white border-green-500 text-xs font-medium">
            {item.quadroTmft}
          </Badge>
        )}
        {item.opcaoTmft && (
          <Badge variant="outline" className="bg-white border-gray-300 text-gray-700 text-xs font-medium">
            {item.opcaoTmft}
          </Badge>
        )}
        <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-700">
          {item.om}
        </Badge>
        {item.tipoSetor === "EXTRA LOTAÇÃO" && (
          <Badge className="bg-orange-500 text-white text-xs">SEM NEO</Badge>
        )}
      </div>

      {/* Military name with posto-quadro prefix */}
      <p className={`font-bold text-sm uppercase ${isDifferentNeoEfe ? 'text-amber-700' : 'text-foreground'}`}>
        {item.ocupado && item.nome && item.nome.toUpperCase() !== 'VAGO' 
          ? formatMilitarName() 
          : item.nome || "VAGO"}
      </p>

      {/* Cargo */}
      <p className="text-xs text-muted-foreground uppercase">{item.cargo === "EXTRA LOTAÇÃO" ? "SEM NEO" : item.cargo}</p>

      {/* Setor */}
      <p className="text-xs text-muted-foreground">{item.setor}</p>

      {/* Warning message for NEO ≠ EFE discrepancy */}
      {isDifferentNeoEfe && (
        <p className="text-xs mt-1.5 font-medium text-amber-700 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          NEO ({item.postoTmft || "?"}/{item.quadroTmft || "-"}) ≠ EFE ({item.postoEfe || "?"}/{item.quadroEfe || "-"})
        </p>
      )}
    </div>
  );
};

export default OfficerCard;
