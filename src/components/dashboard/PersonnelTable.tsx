import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MilitaryData } from "@/types/military";

interface PersonnelTableProps {
  data: MilitaryData[];
  categoria: "PRAÇAS" | "OFICIAIS";
}

export const PersonnelTable = ({ data, categoria }: PersonnelTableProps) => {
  // Get unique OMs
  const allOMs = Array.from(new Set(data.map((item) => item.om))).sort();

  // Define graduation order based on categoria
  const graduationOrderPracas = ["SO", "1SG", "2SG", "3SG", "CB", "MN", "PRAÇAS TTC", "SERVIDORES CIVIS (NA + NI)"];

  const graduationOrderOficiais = [
    "CONTRA-ALMIRANTE",
    "CMG",
    "CF",
    "CC",
    "CT",
    "1TEN",
    "2TEN",
    "GM",
    "OFICIAIS TTC",
    "SERVIDORES CIVIS (NA + NI)",
  ];

  const graduationOrder = categoria === "PRAÇAS" ? graduationOrderPracas : graduationOrderOficiais;

  // Get unique graduations in specified order
  const allGraduations = graduationOrder.filter((grad) => data.some((item) => item.graduacao === grad));

  // Build table data structure
  const tableData = allGraduations.map((graduacao) => {
    const row: any = { categoria: graduacao };

    allOMs.forEach((om) => {
      const items = data.filter((item) => item.om === om && item.graduacao === graduacao);
      const tmft = items.reduce((sum, item) => sum + item.tmft, 0);
      const exi = items.reduce((sum, item) => sum + item.exi, 0);
      const dif = exi - tmft; // DIF = EXI - TMFT

      row[`${om}_tmft`] = tmft;
      row[`${om}_exi`] = exi;
      row[`${om}_dif`] = dif;
    });

    return row;
  });

  // Calculate totals
  const totals: any = { categoria: "TOTAL" };
  allOMs.forEach((om) => {
    const items = data.filter((item) => item.om === om);
    const tmft = items.reduce((sum, item) => sum + item.tmft, 0);
    const exi = items.reduce((sum, item) => sum + item.exi, 0);
    const dif = exi - tmft;

    totals[`${om}_tmft`] = tmft;
    totals[`${om}_exi`] = exi;
    totals[`${om}_dif`] = dif;
  });

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Quadro de Pessoal - Organização Militar</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">Categoria</TableHead>
              {allOMs.map((om) => (
                <TableHead key={om} colSpan={3} className="text-center font-bold border-l border-border">
                  {om}
                </TableHead>
              ))}
            </TableRow>
            <TableRow>
              <TableHead></TableHead>
              {allOMs.map((om) => (
                <>
                  <TableHead key={`${om}-tmft`} className="text-center border-l border-border">
                    TMFT
                  </TableHead>
                  <TableHead key={`${om}-exi`} className="text-center">
                    EXI
                  </TableHead>
                  <TableHead key={`${om}-dif`} className="text-center">
                    DIF
                  </TableHead>
                </>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((row) => (
              <TableRow key={row.categoria}>
                <TableCell className="font-semibold">{row.categoria}</TableCell>
                {allOMs.map((om) => (
                  <>
                    <TableCell key={`${om}-tmft`} className="text-center border-l border-border">
                      {row[`${om}_tmft`]}
                    </TableCell>
                    <TableCell key={`${om}-exi`} className="text-center">
                      {row[`${om}_exi`]}
                    </TableCell>
                    <TableCell
                      key={`${om}-dif`}
                      className={`text-center font-semibold ${
                        row[`${om}_dif`] > 0
                          ? "text-green-600 bg-green-50"
                          : row[`${om}_dif`] < 0
                            ? "text-red-600 bg-red-50"
                            : ""
                      }`}
                    >
                      {row[`${om}_dif`] > 0 ? "+" : ""}
                      {row[`${om}_dif`]}
                    </TableCell>
                  </>
                ))}
              </TableRow>
            ))}
            {/* Total Row */}
            <TableRow className="bg-blue-600 text-white font-bold">
              <TableCell className="font-bold">{totals.categoria}</TableCell>
              {allOMs.map((om) => (
                <>
                  <TableCell key={`${om}-tmft`} className="text-center border-l border-white/20">
                    {totals[`${om}_tmft`]}
                  </TableCell>
                  <TableCell key={`${om}-exi`} className="text-center">
                    {totals[`${om}_exi`]}
                  </TableCell>
                  <TableCell
                    key={`${om}-dif`}
                    className={`text-center font-bold ${
                      totals[`${om}_dif`] > 0 ? "bg-green-600" : totals[`${om}_dif`] < 0 ? "bg-red-600" : ""
                    }`}
                  >
                    {totals[`${om}_dif`] > 0 ? "+" : ""}
                    {totals[`${om}_dif`]}
                  </TableCell>
                </>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
