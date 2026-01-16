'use client';

import { Euro, TrendingUp, PiggyBank, HelpCircle, Info, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';

interface CalculationExplanationPopupProps {
  onClose: () => void;
}

export function CalculationExplanationPopup({ onClose }: CalculationExplanationPopupProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            Berechnungserklärung
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Begriffserklärungen */}
          <div>
            <h3 className="text-md font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Euro className="w-4 h-4 text-green-600" />
              Begriffserklärungen
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left font-semibold border">Begriff</th>
                    <th className="px-4 py-2 text-left font-semibold border">Erklärung</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2 border font-medium text-green-700">Mietpreis (Brutto)</td>
                    <td className="px-4 py-2 border">
                      Der Gesamtpreis, den der Gast bezahlt. Bei Direktbuchungen ist dies der volle Betrag. Bei
                      Plattformen wie FeWo ist dies der Betrag nach Plattform-Gebühren.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border font-medium text-blue-700">Nettomiete</td>
                    <td className="px-4 py-2 border">
                      <strong>Mietpreis − alle kalkulatorischen Kosten</strong>
                      <br />
                      <span className="text-xs text-gray-500">
                        Kalkulatorische Kosten = Kurtaxe + Holz + Wasser + Müll + Strom (+ Reinigung wenn nicht bar)
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border font-medium text-purple-700">Provision</td>
                    <td className="px-4 py-2 border">
                      Anteil für Malte & Eike (Verwaltung/Marketing):
                      <br />
                      <strong>10% der Nettomiete</strong> (nach Abzug aller kalkulatorischen Kosten).
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2 border font-medium text-orange-700">Kalkulatorische Nebenkosten</td>
                    <td className="px-4 py-2 border">
                      Geschätzte Kosten für den Betrieb:
                      <br />
                      • Holz, Wasser, Müll, Strom (verbrauchsabhängig)
                      <br />
                      • Kurtaxe (pro Person/Tag)
                      <br />• Reinigung (optional: bar oder inkludiert)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border font-medium text-emerald-700">Ertrag</td>
                    <td className="px-4 py-2 border">
                      Was nach Abzug aller Kosten übrig bleibt:
                      <br />
                      <code className="bg-gray-200 px-1 rounded">
                        Nettomiete − Provision + NK (bar) + Reinigung (bar)
                      </code>
                      <br />
                      <span className="text-xs text-gray-500">NK und Reinigung werden addiert wenn bar vor Ort bezahlt</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Rechenbeispiel */}
          <div>
            <h3 className="text-md font-bold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Rechenbeispiel: Buchung (1 Woche, 4 Personen, Winter)
            </h3>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-1">Mietpreis (Auszahlung):</td>
                    <td className="py-1 text-right font-mono font-medium text-green-700">
                      {formatCurrency(1300)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 text-gray-600">− Kalkulatorische Kosten:</td>
                    <td className="py-1 text-right font-mono text-red-600">−{formatCurrency(286)}</td>
                  </tr>
                  <tr className="text-xs text-gray-400">
                    <td className="pl-4">Kurtaxe (7×4×2,70€)</td>
                    <td className="text-right font-mono">{formatCurrency(75.6)}</td>
                  </tr>
                  <tr className="text-xs text-gray-400">
                    <td className="pl-4">Holz (5 Bündel)</td>
                    <td className="text-right font-mono">{formatCurrency(30)}</td>
                  </tr>
                  <tr className="text-xs text-gray-400">
                    <td className="pl-4">Wasser + Müll + Strom</td>
                    <td className="text-right font-mono">{formatCurrency(80.4)}</td>
                  </tr>
                  <tr className="text-xs text-gray-400">
                    <td className="pl-4">Reinigung (in Miete enthalten)</td>
                    <td className="text-right font-mono">{formatCurrency(100)}</td>
                  </tr>
                  <tr className="border-t border-blue-200 font-medium">
                    <td className="py-1 text-blue-700">= Nettomiete:</td>
                    <td className="py-1 text-right font-mono text-blue-700">{formatCurrency(1014)}</td>
                  </tr>
                  <tr>
                    <td className="py-1">− Provision (10%):</td>
                    <td className="py-1 text-right font-mono text-purple-600">−{formatCurrency(101.4)}</td>
                  </tr>
                  <tr className="border-t border-blue-300 font-bold">
                    <td className="py-2 text-emerald-700">= Ertrag:</td>
                    <td className="py-2 text-right font-mono text-emerald-700">{formatCurrency(912.6)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-gray-500 mt-3">
                Hinweis: Die kalkulatorischen Kosten werden geschätzt und können vom tatsächlichen Verbrauch abweichen.
              </p>
            </div>
          </div>

          {/* Nebenkosten-Aufschlüsselung */}
          <div>
            <h3 className="text-md font-bold text-gray-900 mb-3 flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-orange-600" />
              Kalkulatorische Nebenkosten (1 Woche, Winter)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-orange-100">
                    <th className="px-4 py-2 text-left font-semibold border">Position</th>
                    <th className="px-4 py-2 text-left font-semibold border">Berechnung</th>
                    <th className="px-4 py-2 text-right font-semibold border">Preis</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2 border">Holz</td>
                    <td className="px-4 py-2 border">5 Bündel × 6,00 € (Winter: 5/Woche)</td>
                    <td className="px-4 py-2 border text-right font-mono">{formatCurrency(30)}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2 border">Wasser</td>
                    <td className="px-4 py-2 border">4 Personen × 1 Woche × 6,00 €</td>
                    <td className="px-4 py-2 border text-right font-mono">{formatCurrency(24)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border">Müll</td>
                    <td className="px-4 py-2 border">2 Säcke × 3,00 €</td>
                    <td className="px-4 py-2 border text-right font-mono">{formatCurrency(6)}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2 border">Strom</td>
                    <td className="px-4 py-2 border">360 kWh inkl. × 0,35 €</td>
                    <td className="px-4 py-2 border text-right font-mono">{formatCurrency(126)}</td>
                  </tr>
                  <tr className="bg-orange-50 font-medium">
                    <td className="px-4 py-2 border">Summe Nebenkosten</td>
                    <td className="px-4 py-2 border"></td>
                    <td className="px-4 py-2 border text-right font-mono">{formatCurrency(186)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * Kurtaxe und Reinigung werden separat berechnet und sind nicht in den Nebenkosten enthalten.
            </p>
          </div>

          {/* Reinigungskosten-Option */}
          <div>
            <h3 className="text-md font-bold text-gray-900 mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-gray-600" />
              Reinigungskosten: Zwei Optionen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">✓ In Nebenkosten enthalten</h4>
                <p className="text-sm text-green-700">
                  Die Reinigungskosten (100 €) werden von der Miete abgezogen und reduzieren den Ertrag. Der Gast
                  bezahlt nichts extra vor Ort.
                </p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <h4 className="font-semibold text-amber-800 mb-2">💵 Bar vor Ort bezahlt</h4>
                <p className="text-sm text-amber-700">
                  Die Reinigung wird bar vom Gast vor Ort bezahlt. Sie wird NICHT von der Miete abgezogen und erhöht
                  somit den Ertrag.
                </p>
              </div>
            </div>
          </div>

          {/* Hinweis zur Provision */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <h3 className="text-md font-bold text-purple-900 mb-2 flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-purple-600" />
              Provision für Malte & Eike
            </h3>
            <p className="text-sm text-purple-800">
              <strong>10% der Nettomiete</strong> – nach Abzug aller kalkulatorischen Kosten.
            </p>
            <p className="text-xs text-purple-600 mt-2">
              Kalkulatorische Kosten = Kurtaxe + Holz + Wasser + Müll + Strom (+ Reinigung wenn nicht bar).
            </p>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
