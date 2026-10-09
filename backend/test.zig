const std = @import("std");

pub fn main() !void {
    const stdout = std.io.getStdOut().writer();
    try stdout.print("Zig Crew Extractor Initialized v0.13.0\n", .{});
}
