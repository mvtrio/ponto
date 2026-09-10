import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { buildReportHtml } from "./reportHtml";
import type { EmployeeReport } from "./reportData";

/**
 * Gera o relatório em PDF.
 *
 * No web, `Print.printToFileAsync` não renderiza o HTML que recebe: o resultado saía com
 * a interface do próprio app impressa. Então abrimos o HTML numa janela nova e chamamos
 * o print do navegador, que gera o PDF a partir do documento certo. No nativo, o caminho
 * do expo-print funciona e o arquivo é compartilhado.
 */
export async function exportPdf(
  reports: EmployeeReport[],
  fromDate: string,
  toDate: string
): Promise<void> {
  const html = buildReportHtml(reports, fromDate, toDate, new Date());

  if (Platform.OS === "web") {
    const win = window.open("", "_blank");
    if (!win) {
      throw new Error("O navegador bloqueou a janela do relatório. Libere os pop-ups e tente de novo.");
    }
    win.document.write(html);
    win.document.close();
    // Espera o layout antes de imprimir, senão a caixa de impressão abre sobre página em branco.
    win.onload = () => win.print();
    setTimeout(() => {
      try {
        win.print();
      } catch {
        // A janela pode ter sido fechada pelo usuário antes disso — não é erro.
      }
    }, 500);
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf" });
  }
}
