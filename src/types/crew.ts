export interface CostPair {
  hourly: number;
  daily: number;
}

export interface LaborCostPair {
  bare: number;
  inclOP: number;
}

export interface LineItem {
  description: string;
  bareCosts: CostPair;
  indSubsOP: CostPair;
  costPerLaborHour?: LaborCostPair | null;
}

export interface DailyTotals {
  bareCosts: CostPair;
  indSubsOP: CostPair;
  costPerLaborHour: LaborCostPair;
}

export interface CrewData {
  crewId: string;
  lineItems: LineItem[];
  dailyTotals: DailyTotals;
}

export interface LabourData {
  description: string;
  bareCosts: CostPair;
  indSubsOP: CostPair;
  costPerLaborHour: LaborCostPair;
}

export interface LabourSummaryItem extends LabourData {
  occurrences: number;
  crewIds: string[];
}
