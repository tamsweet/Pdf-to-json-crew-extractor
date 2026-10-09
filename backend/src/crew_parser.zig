const std = @import("std");
const types = @import("types.zig");

pub const CrewParser = struct {
    allocator: std.mem.Allocator,

    pub fn init(allocator: std.mem.Allocator) CrewParser {
        return .{ .allocator = allocator };
    }

    pub fn parseText(self: *CrewParser, raw_input: []const u8) ![]types.CrewData {
        const input = try self.deinterleaveTwoColumns(raw_input);
        defer if (input.ptr != raw_input.ptr) self.allocator.free(input);

        var crews = std.ArrayList(types.CrewData).init(self.allocator);
        errdefer {
            for (crews.items) |crew| {
                self.freeCrew(crew);
            }
            crews.deinit();
        }

        var lines = std.mem.splitScalar(u8, input, '\n');
        var current_crew_id: ?[]u8 = null;
        var current_items = std.ArrayList(types.LineItem).init(self.allocator);
        defer {
            if (current_crew_id) |id| {
                self.allocator.free(id);
            }
            for (current_items.items) |item| {
                self.allocator.free(item.description);
            }
            current_items.deinit();
        }

        var current_totals: ?types.DailyTotals = null;

        while (lines.next()) |raw_line| {
            const line = std.mem.trim(u8, raw_line, " \t\r");
            if (line.len == 0) continue;

            // Check for footer / copyright RSMeans noise
            if (std.mem.indexOf(u8, line, "customer support") != null or
                std.mem.indexOf(u8, line, "800.448.8182") != null or
                std.mem.indexOf(u8, line, "RSMeans") != null)
            {
                continue;
            }

            // Check if this is a table column subheader (e.g. "Crew No. Bare Costs...", "Bare Costs")
            if (isTableSubHeader(line)) continue;

            // Check if this line starts a new crew, e.g. "Crew A-1", "Crew A-1A", "Crew B-34B"
            if (isCrewHeader(line)) {
                // If we had a previous crew with items, finalize it
                if (current_crew_id) |cid| {
                    if (current_items.items.len > 0) {
                        const items_slice = try self.allocator.dupe(types.LineItem, current_items.items);
                        try crews.append(.{
                            .crewId = cid,
                            .lineItems = items_slice,
                            .dailyTotals = current_totals orelse types.DailyTotals{},
                        });
                        // Reset for next crew
                        current_items.clearRetainingCapacity();
                        current_totals = null;
                        current_crew_id = null;
                    } else {
                        self.allocator.free(cid);
                        current_crew_id = null;
                    }
                }

                current_crew_id = try extractCrewId(self.allocator, line);
                continue;
            }

            // If we are currently inside a crew block:
            if (current_crew_id != null) {
                // Check if this is a header line to ignore
                if (isTableSubHeader(line)) continue;

                // Check if this is "Daily Totals" or "X L.H., Daily Totals"
                if (std.mem.indexOf(u8, line, "Daily Totals") != null or
                    std.mem.indexOf(u8, line, "Totals") != null)
                {
                    const numbers = try self.extractNumbers(line);
                    defer self.allocator.free(numbers);

                    var dt = types.DailyTotals{};
                    // Expected totals numbers: Bare Daily, O&P Daily, Bare Cost/LH, Incl O&P Cost/LH
                    // Or if 4 numbers found:
                    if (numbers.len >= 4) {
                        dt.bareCosts.daily = numbers[numbers.len - 4];
                        dt.indSubsOP.daily = numbers[numbers.len - 3];
                        dt.costPerLaborHour.bare = numbers[numbers.len - 2];
                        dt.costPerLaborHour.inclOP = numbers[numbers.len - 1];
                    } else if (numbers.len == 2) {
                        dt.bareCosts.daily = numbers[0];
                        dt.indSubsOP.daily = numbers[1];
                    } else if (numbers.len == 3) {
                        dt.bareCosts.daily = numbers[0];
                        dt.indSubsOP.daily = numbers[1];
                        dt.costPerLaborHour.bare = numbers[2];
                    }
                    current_totals = dt;

                    // Finalize this crew now!
                    if (current_crew_id) |cid| {
                        const items_slice = try self.allocator.dupe(types.LineItem, current_items.items);
                        try crews.append(.{
                            .crewId = cid,
                            .lineItems = items_slice,
                            .dailyTotals = current_totals orelse types.DailyTotals{},
                        });
                        current_items.clearRetainingCapacity();
                        current_totals = null;
                        current_crew_id = null;
                    }
                    continue;
                }

                // Otherwise, try parsing as a Line Item
                if (try self.parseLineItem(line)) |item| {
                    try current_items.append(item);
                }
            }
        }

        // Finalize last crew if not already finalized
        if (current_crew_id) |cid| {
            if (current_items.items.len > 0) {
                const items_slice = try self.allocator.dupe(types.LineItem, current_items.items);
                try crews.append(.{
                    .crewId = cid,
                    .lineItems = items_slice,
                    .dailyTotals = current_totals orelse types.DailyTotals{},
                });
                current_items.clearRetainingCapacity();
                current_crew_id = null;
            }
        }

        return crews.toOwnedSlice();
    }

    fn freeCrew(self: *CrewParser, crew: types.CrewData) void {
        self.allocator.free(crew.crewId);
        for (crew.lineItems) |item| {
            self.allocator.free(item.description);
        }
        self.allocator.free(crew.lineItems);
    }

    pub fn freeCrews(self: *CrewParser, crews: []types.CrewData) void {
        for (crews) |crew| {
            self.freeCrew(crew);
        }
        self.allocator.free(crews);
    }

    pub fn extractUniqueLabourData(self: *CrewParser, crews: []const types.CrewData) ![]types.LabourData {
        var list = std.ArrayList(types.LabourData).init(self.allocator);
        errdefer {
            for (list.items) |item| {
                self.allocator.free(item.description);
            }
            list.deinit();
        }

        for (crews) |crew| {
            for (crew.lineItems) |line_item| {
                // Only consider labor items (items with hourly rates or costPerLaborHour)
                if (line_item.bareCosts.hourly == 0.0 and line_item.costPerLaborHour == null) {
                    continue;
                }

                // Check if already in list
                var found = false;
                for (list.items) |existing| {
                    if (std.mem.eql(u8, existing.description, line_item.description)) {
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    const desc_copy = try self.allocator.dupe(u8, line_item.description);
                    var cost_per_lh = types.LaborCostPair{};
                    if (line_item.costPerLaborHour) |cplh| {
                        cost_per_lh = cplh;
                    } else if (line_item.bareCosts.hourly > 0.0) {
                        cost_per_lh = .{
                            .bare = line_item.bareCosts.hourly,
                            .inclOP = line_item.indSubsOP.hourly,
                        };
                    }

                    try list.append(.{
                        .description = desc_copy,
                        .bareCosts = line_item.bareCosts,
                        .indSubsOP = line_item.indSubsOP,
                        .costPerLaborHour = cost_per_lh,
                    });
                }
            }
        }

        return list.toOwnedSlice();
    }

    pub fn freeLabourData(self: *CrewParser, items: []types.LabourData) void {
        for (items) |item| {
            self.allocator.free(item.description);
        }
        self.allocator.free(items);
    }

    fn isCrewHeader(raw_line: []const u8) bool {
        const line = std.mem.trimLeft(u8, raw_line, " \t");
        if (!std.mem.startsWith(u8, line, "Crew ")) return false;
        // Exclude table column headers such as "Crew No." or "Crew No. Bare Costs..."
        if (std.mem.startsWith(u8, line, "Crew No.") or
            std.mem.startsWith(u8, line, "Crew No") or
            std.mem.startsWith(u8, line, "Crew Number"))
        {
            return false;
        }
        // Ensure there's an identifier like A-1, B-10, C-4, etc.
        const rest = std.mem.trim(u8, line[5..], " \t");
        if (rest.len == 0) return false;
        return true;
    }

    fn extractCrewId(allocator: std.mem.Allocator, raw_line: []const u8) ![]u8 {
        const line = std.mem.trimLeft(u8, raw_line, " \t");
        var it = std.mem.tokenizeAny(u8, line, " \t");
        const prefix = it.next() orelse "Crew";
        const id = it.next() orelse "Unknown";
        _ = prefix;

        // Clean id of any trailing garbage
        const clean_id = std.mem.trim(u8, id, " \t,:;");
        return std.fmt.allocPrint(allocator, "Crew {s}", .{clean_id});
    }

    fn isTableSubHeader(line: []const u8) bool {
        if (std.mem.eql(u8, line, "Hr. Daily Hr. Daily")) return true;
        if (std.mem.eql(u8, line, "Bare Costs")) return true;
        if (std.mem.eql(u8, line, "Incl. Subs O&P")) return true;
        if (std.mem.eql(u8, line, "Cost Per Labor-Hour")) return true;
        if (std.mem.eql(u8, line, "Bare") or std.mem.eql(u8, line, "Incl.") or std.mem.eql(u8, line, "O&P")) return true;
        if (std.mem.eql(u8, line, "Costs")) return true;
        if (std.mem.indexOf(u8, line, "Crews - Standard") != null) return true;
        if (std.mem.indexOf(u8, line, "Crew No.") != null) return true;
        if (std.mem.indexOf(u8, line, "Crew No") != null) return true;
        if (std.mem.indexOf(u8, line, "Bare Costs") != null and std.mem.indexOf(u8, line, "Incl.") != null) return true;
        return false;
    }

    fn parseLineItem(self: *CrewParser, line: []const u8) !?types.LineItem {
        // A line item row typically consists of:
        // Text description + 1 to 6 floating numbers at the end
        // e.g.: "1 Building Laborer $39.85 $318.80 $60.70 $485.60 $39.85 $60.70"
        // e.g.: "1 Concrete Saw, Gas Manual 71.20 78.32 8.90 9.79"
        // e.g.: "1 Flatbed Truck, Gas, 1.5 Ton 188.40 207.24"
        // e.g.: ".25 Truck Driver (light) 44.50 89.00 67.00 134.00"

        var tokens = std.ArrayList([]const u8).init(self.allocator);
        defer tokens.deinit();

        var it = std.mem.tokenizeAny(u8, line, " \t");
        while (it.next()) |raw_tok| {
            // Check if token contains an attached '$', e.g. "(light)$44.50" or "Laborer$39.85"
            if (std.mem.indexOfScalar(u8, raw_tok, '$')) |dollar_idx| {
                if (dollar_idx > 0) {
                    try tokens.append(raw_tok[0..dollar_idx]);
                    try tokens.append(raw_tok[dollar_idx..]);
                    continue;
                }
            }
            try tokens.append(raw_tok);
        }

        if (tokens.items.len < 2) return null;

        // Find where the trailing numbers start
        var num_indices = std.ArrayList(usize).init(self.allocator);
        defer num_indices.deinit();

        var i: usize = tokens.items.len;
        while (i > 0) {
            i -= 1;
            const tok = tokens.items[i];
            if (isNumericToken(tok)) {
                try num_indices.insert(0, i);
            } else {
                // If it's a known non-number word, stop trailing number collection
                break;
            }
        }

        if (num_indices.items.len == 0) return null;

        const first_num_idx = num_indices.items[0];
        if (first_num_idx == 0) return null; // No description

        // Join description tokens from 0 to first_num_idx
        var desc_buf = std.ArrayList(u8).init(self.allocator);
        errdefer desc_buf.deinit();

        for (tokens.items[0..first_num_idx], 0..) |tok, idx| {
            if (idx > 0) try desc_buf.append(' ');
            try desc_buf.appendSlice(tok);
        }

        const description = try desc_buf.toOwnedSlice();
        errdefer self.allocator.free(description);

        // Parse numbers
        var numbers = std.ArrayList(f64).init(self.allocator);
        defer numbers.deinit();

        for (num_indices.items) |idx| {
            const val = parseNum(tokens.items[idx]) orelse 0.0;
            try numbers.append(val);
        }

        var item = types.LineItem{
            .description = description,
        };

        const count = numbers.items.len;
        if (count >= 6) {
            // Full 6 columns: Bare Hr, Bare Daily, O&P Hr, O&P Daily, Labor Bare, Labor O&P
            item.bareCosts.hourly = numbers.items[0];
            item.bareCosts.daily = numbers.items[1];
            item.indSubsOP.hourly = numbers.items[2];
            item.indSubsOP.daily = numbers.items[3];
            item.costPerLaborHour = .{
                .bare = numbers.items[4],
                .inclOP = numbers.items[5],
            };
        } else if (count == 5) {
            item.bareCosts.hourly = numbers.items[0];
            item.bareCosts.daily = numbers.items[1];
            item.indSubsOP.hourly = numbers.items[2];
            item.indSubsOP.daily = numbers.items[3];
            item.costPerLaborHour = .{
                .bare = numbers.items[4],
                .inclOP = 0.0,
            };
        } else if (count == 4) {
            // Can be: Bare Hr, Bare Daily, O&P Hr, O&P Daily (labor row without costPerLaborHour)
            // OR: Bare Daily, O&P Daily, Labor Bare, Labor O&P (equipment row with costPerLaborHour)
            // Look at description or magnitudes: if first number is standard hourly (< 100) and 2nd is ~8x, it's hourly/daily!
            const n0 = numbers.items[0];
            const n1 = numbers.items[1];
            if (n0 > 0.0 and (n1 / n0 >= 7.0 and n1 / n0 <= 25.0)) {
                // Labor: [Bare Hr, Bare Daily, O&P Hr, O&P Daily]
                item.bareCosts.hourly = numbers.items[0];
                item.bareCosts.daily = numbers.items[1];
                item.indSubsOP.hourly = numbers.items[2];
                item.indSubsOP.daily = numbers.items[3];
            } else {
                // Equipment with cost/LH: [Bare Daily, O&P Daily, Labor Bare, Labor O&P]
                item.bareCosts.daily = numbers.items[0];
                item.indSubsOP.daily = numbers.items[1];
                item.costPerLaborHour = .{
                    .bare = numbers.items[2],
                    .inclOP = numbers.items[3],
                };
            }
        } else if (count == 2) {
            // Equipment row with only [Bare Daily, O&P Daily]
            item.bareCosts.daily = numbers.items[0];
            item.indSubsOP.daily = numbers.items[1];
        } else if (count == 1) {
            item.bareCosts.daily = numbers.items[0];
        }

        return item;
    }

    fn extractNumbers(self: *CrewParser, line: []const u8) ![]f64 {
        var list = std.ArrayList(f64).init(self.allocator);
        errdefer list.deinit();

        var it = std.mem.tokenizeAny(u8, line, " \t");
        while (it.next()) |tok| {
            if (isNumericToken(tok)) {
                if (parseNum(tok)) |val| {
                    try list.append(val);
                }
            }
        }
        return list.toOwnedSlice();
    }

    fn deinterleaveTwoColumns(self: *CrewParser, input: []const u8) ![]const u8 {
        var check_lines = std.mem.splitScalar(u8, input, '\n');
        var long_lines_count: usize = 0;

        while (check_lines.next()) |line| {
            if (line.len > 55) {
                long_lines_count += 1;
            }
        }

        if (long_lines_count < 2) {
            // Not a multi-column document with wide lines
            return input;
        }

        // Find the best gutter split column between 40 and 95
        var best_col: usize = 0;
        var best_score: usize = 0;

        var c: usize = 40;
        while (c < 95) : (c += 1) {
            var score: usize = 0;
            var it = std.mem.splitScalar(u8, input, '\n');
            while (it.next()) |line| {
                if (line.len > 55) {
                    if (c < line.len and (line[c] == ' ' or line[c] == '\t')) {
                        score += 1;
                        if (c > 0 and c - 1 < line.len and (line[c - 1] == ' ' or line[c - 1] == '\t') and
                            c + 1 < line.len and (line[c + 1] == ' ' or line[c + 1] == '\t'))
                        {
                            score += 1; // bonus for being centered in a multi-space gutter
                        }
                    }
                }
            }
            if (score > best_score) {
                best_score = score;
                best_col = c;
            }
        }

        // Require that the gutter is found in a solid majority of long lines
        if (best_score < (long_lines_count * 5) / 10 or best_col == 0) {
            return input;
        }

        var left_buf = std.ArrayList(u8).init(self.allocator);
        defer left_buf.deinit();
        var right_buf = std.ArrayList(u8).init(self.allocator);
        defer right_buf.deinit();

        var split_lines = std.mem.splitScalar(u8, input, '\n');
        while (split_lines.next()) |line| {
            if (line.len <= best_col) {
                const trimmed = std.mem.trimRight(u8, line, " \t\r");
                if (trimmed.len > 0) {
                    try left_buf.appendSlice(trimmed);
                    try left_buf.append('\n');
                }
            } else {
                // Find closest whitespace gap near best_col so we never cut words
                var split_at = best_col;
                if (line[split_at] != ' ' and line[split_at] != '\t') {
                    // search left for space
                    var s = split_at;
                    while (s > 0 and split_at - s < 15) : (s -= 1) {
                        if (line[s] == ' ' or line[s] == '\t') {
                            split_at = s;
                            break;
                        }
                    }
                    if (line[split_at] != ' ' and line[split_at] != '\t') {
                        // search right for space
                        var r = split_at;
                        while (r < line.len and r - split_at < 15) : (r += 1) {
                            if (line[r] == ' ' or line[r] == '\t') {
                                split_at = r;
                                break;
                            }
                        }
                    }
                }

                const left_part = std.mem.trimRight(u8, line[0..split_at], " \t\r");
                const right_part = std.mem.trim(u8, line[split_at..], " \t\r");

                if (left_part.len > 0) {
                    try left_buf.appendSlice(left_part);
                    try left_buf.append('\n');
                }
                if (right_part.len > 0) {
                    try right_buf.appendSlice(right_part);
                    try right_buf.append('\n');
                }
            }
        }

        var combined = std.ArrayList(u8).init(self.allocator);
        errdefer combined.deinit();

        try combined.appendSlice(left_buf.items);
        try combined.append('\n');
        try combined.appendSlice(right_buf.items);

        return combined.toOwnedSlice();
    }
};

fn isNumericToken(raw: []const u8) bool {
    const s = std.mem.trim(u8, raw, " $,\t\r\n;");
    if (s.len == 0) return false;
    var has_digit = false;
    for (s) |c| {
        if (std.ascii.isDigit(c)) {
            has_digit = true;
        } else if (c == '.' or c == '-') {
            // valid punctuation in number
        } else {
            return false;
        }
    }
    return has_digit;
}

fn parseNum(raw: []const u8) ?f64 {
    const s = std.mem.trim(u8, raw, " $,\t\r\n;");
    if (s.len == 0) return null;
    return std.fmt.parseFloat(f64, s) catch null;
}
