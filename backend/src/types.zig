const std = @import("std");

pub const CostPair = struct {
    hourly: f64 = 0.0,
    daily: f64 = 0.0,
};

pub const LaborCostPair = struct {
    bare: f64 = 0.0,
    inclOP: f64 = 0.0,
};

pub const LineItem = struct {
    description: []const u8,
    bareCosts: CostPair = .{},
    indSubsOP: CostPair = .{},
    costPerLaborHour: ?LaborCostPair = null,
};

pub const DailyTotals = struct {
    bareCosts: CostPair = .{},
    indSubsOP: CostPair = .{},
    costPerLaborHour: LaborCostPair = .{},
};

pub const CrewData = struct {
    crewId: []const u8,
    lineItems: []LineItem,
    dailyTotals: DailyTotals,
};

pub const LabourData = struct {
    description: []const u8,
    bareCosts: CostPair = .{},
    indSubsOP: CostPair = .{},
    costPerLaborHour: LaborCostPair = .{},
};
