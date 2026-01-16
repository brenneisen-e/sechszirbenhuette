'use client';

import { Sun, Snowflake } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';
import { CONFIG, WALLI_VALUES, ADULTS_OPTIONS } from './constants';
import { calculateCosts, calculateCostsForDays } from './calculations';
import type { PricingSettings, Season, WeeksCount } from './types';

interface CostTableProps {
  season: Season;
  weeks: WeeksCount;
  pricing: PricingSettings;
}

export function CostTable({ season, weeks, pricing }: CostTableProps) {
  const seasonConfig = CONFIG[season];
  const weekConfig = seasonConfig.weeks[weeks];

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className={`px-4 py-3 ${season === 'summer' ? 'bg-amber-50' : 'bg-blue-50'}`}>
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          {season === 'summer' ? (
            <Sun className="w-5 h-5 text-amber-500" />
          ) : (
            <Snowflake className="w-5 h-5 text-blue-500" />
          )}
          {seasonConfig.name} - {weeks} Woche{weeks > 1 ? 'n' : ''}
        </h4>
        <p className="text-sm text-gray-600">{seasonConfig.months}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Posten</th>
              {ADULTS_OPTIONS.map((a) => (
                <th key={a} className="px-4 py-2 text-right font-medium text-gray-700">
                  {a} Erwachsene
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-4 py-2 text-gray-600">Kurtaxe ({formatCurrency(pricing.kurtaxe)}/Tag/Erw.)</td>
              {ADULTS_OPTIONS.map((a) => {
                const costs = calculateCosts(season, weeks, a, pricing);
                return (
                  <td key={a} className="px-4 py-2 text-right">
                    {formatCurrency(costs.kurtaxe)}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="px-4 py-2 text-gray-600">
                Holz ({formatCurrency(pricing.holz)}/Bündel, {weekConfig.holzBuendel} Stk.)
              </td>
              {ADULTS_OPTIONS.map((a) => {
                const costs = calculateCosts(season, weeks, a, pricing);
                return (
                  <td key={a} className="px-4 py-2 text-right">
                    {formatCurrency(costs.holz)}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="px-4 py-2 text-gray-600">Wasser ({formatCurrency(pricing.water)}/Person/Woche)</td>
              {ADULTS_OPTIONS.map((a) => {
                const costs = calculateCosts(season, weeks, a, pricing);
                return (
                  <td key={a} className="px-4 py-2 text-right">
                    {formatCurrency(costs.water)}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="px-4 py-2 text-gray-600">Müll ({formatCurrency(pricing.trash)}/Sack)</td>
              {ADULTS_OPTIONS.map((a) => {
                const costs = calculateCosts(season, weeks, a, pricing);
                return (
                  <td key={a} className="px-4 py-2 text-right">
                    {formatCurrency(costs.trash)}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="px-4 py-2 text-gray-600">Strom ({formatCurrency(pricing.electricity)}/kWh)</td>
              {ADULTS_OPTIONS.map((a) => {
                const costs = calculateCosts(season, weeks, a, pricing);
                return (
                  <td key={a} className="px-4 py-2 text-right">
                    <div>{formatCurrency(costs.electricity)}</div>
                    <div className="text-xs text-gray-400">{costs.electricityKwh} kWh</div>
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="px-4 py-2 text-gray-600">Reinigung (pro Buchung)</td>
              {ADULTS_OPTIONS.map((a) => {
                const costs = calculateCosts(season, weeks, a, pricing);
                return (
                  <td key={a} className="px-4 py-2 text-right">
                    {formatCurrency(costs.reinigung)}
                  </td>
                );
              })}
            </tr>
          </tbody>
          <tfoot className="bg-gray-100 font-semibold">
            <tr>
              <td className="px-4 py-3 text-gray-900">Summe (berechnet)</td>
              {ADULTS_OPTIONS.map((a) => {
                const costs = calculateCosts(season, weeks, a, pricing);
                return (
                  <td key={a} className="px-4 py-3 text-right text-gray-900">
                    {formatCurrency(costs.total)}
                  </td>
                );
              })}
            </tr>
            <tr className="text-gray-500 font-normal">
              <td className="px-4 py-2 text-sm">Angabe von Walli (gerundet)</td>
              {ADULTS_OPTIONS.map((a) => (
                <td key={a} className="px-4 py-2 text-right text-sm">
                  {formatCurrency(WALLI_VALUES[season][weeks][a])}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

interface DayBasedCostTableProps {
  season: Season;
  days: number;
  pricing: PricingSettings;
}

export function DayBasedCostTable({ season, days, pricing }: DayBasedCostTableProps) {
  const seasonConfig = CONFIG[season];
  const weeks = days / 7;
  const holzBuendelPerWeek = season === 'summer' ? 2 : 5;
  const holzBuendel = Math.ceil(holzBuendelPerWeek * weeks);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className={`px-4 py-3 ${season === 'summer' ? 'bg-amber-50' : 'bg-blue-50'}`}>
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          {season === 'summer' ? (
            <Sun className="w-5 h-5 text-amber-500" />
          ) : (
            <Snowflake className="w-5 h-5 text-blue-500" />
          )}
          {seasonConfig.name} - {days} Tage ({weeks.toFixed(1)} Wochen)
        </h4>
        <p className="text-sm text-gray-600">{seasonConfig.months}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Posten</th>
              {ADULTS_OPTIONS.map((a) => (
                <th key={a} className="px-4 py-2 text-right font-medium text-gray-700">
                  {a} Erwachsene
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-4 py-2 text-gray-600">Kurtaxe ({formatCurrency(pricing.kurtaxe)}/Tag/Erw.)</td>
              {ADULTS_OPTIONS.map((a) => {
                const costs = calculateCostsForDays(season, days, a, pricing);
                return (
                  <td key={a} className="px-4 py-2 text-right">
                    {formatCurrency(costs.kurtaxe)}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="px-4 py-2 text-gray-600">
                Holz ({formatCurrency(pricing.holz)}/Bündel, {holzBuendel} Stk.)
              </td>
              {ADULTS_OPTIONS.map((a) => {
                const costs = calculateCostsForDays(season, days, a, pricing);
                return (
                  <td key={a} className="px-4 py-2 text-right">
                    {formatCurrency(costs.holz)}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="px-4 py-2 text-gray-600">Wasser ({formatCurrency(pricing.water)}/Person/Woche)</td>
              {ADULTS_OPTIONS.map((a) => {
                const costs = calculateCostsForDays(season, days, a, pricing);
                return (
                  <td key={a} className="px-4 py-2 text-right">
                    {formatCurrency(costs.water)}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="px-4 py-2 text-gray-600">Müll ({formatCurrency(pricing.trash)}/Sack)</td>
              {ADULTS_OPTIONS.map((a) => {
                const costs = calculateCostsForDays(season, days, a, pricing);
                return (
                  <td key={a} className="px-4 py-2 text-right">
                    <div>{formatCurrency(costs.trash)}</div>
                    <div className="text-xs text-gray-400">{costs.trashBags} Säcke</div>
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="px-4 py-2 text-gray-600">Strom ({formatCurrency(pricing.electricity)}/kWh)</td>
              {ADULTS_OPTIONS.map((a) => {
                const costs = calculateCostsForDays(season, days, a, pricing);
                return (
                  <td key={a} className="px-4 py-2 text-right">
                    <div>{formatCurrency(costs.electricity)}</div>
                    <div className="text-xs text-gray-400">{costs.electricityKwh} kWh</div>
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="px-4 py-2 text-gray-600">Reinigung (pro Buchung)</td>
              {ADULTS_OPTIONS.map((a) => {
                const costs = calculateCostsForDays(season, days, a, pricing);
                return (
                  <td key={a} className="px-4 py-2 text-right">
                    {formatCurrency(costs.reinigung)}
                  </td>
                );
              })}
            </tr>
          </tbody>
          <tfoot className="bg-gray-100 font-semibold">
            <tr>
              <td className="px-4 py-3 text-gray-900">Summe (berechnet)</td>
              {ADULTS_OPTIONS.map((a) => {
                const costs = calculateCostsForDays(season, days, a, pricing);
                return (
                  <td key={a} className="px-4 py-3 text-right text-gray-900">
                    {formatCurrency(costs.total)}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
