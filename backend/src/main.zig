const std = @import("std");
const types = @import("types.zig");
const CrewParser = @import("crew_parser.zig").CrewParser;

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const args = try std.process.argsAlloc(allocator);
    defer std.process.argsFree(allocator, args);

    if (args.len > 1 and std.mem.eql(u8, args[1], "--server")) {
        var port: u16 = 8080;
        if (args.len > 2) {
            port = try std.fmt.parseInt(u16, args[2], 10);
        }
        try runHttpServer(allocator, port);
        return;
    }

    if (args.len > 1 and std.mem.eql(u8, args[1], "--version")) {
        const stdout = std.io.getStdOut().writer();
        try stdout.print("Crew Standard Extractor (Zig) v1.0.0\n", .{});
        return;
    }

    var output_labour_only = false;
    var target_filepath: ?[]const u8 = null;

    for (args[1..]) |arg| {
        if (std.mem.eql(u8, arg, "--labour") or std.mem.eql(u8, arg, "--labor")) {
            output_labour_only = true;
        } else if (!std.mem.startsWith(u8, arg, "-")) {
            target_filepath = arg;
        }
    }

    // Default: read input file or stdin
    var input_data: []u8 = undefined;
    var need_free_input = false;
    defer {
        if (need_free_input) allocator.free(input_data);
    }

    if (target_filepath) |filepath| {
        // Check if PDF file
        if (std.mem.endsWith(u8, filepath, ".pdf") or std.mem.endsWith(u8, filepath, ".PDF")) {
            input_data = try extractTextFromPdf(allocator, filepath);
            need_free_input = true;
        } else {
            // Read regular text file
            const file = try std.fs.cwd().openFile(filepath, .{});
            defer file.close();
            input_data = try file.readToEndAlloc(allocator, 50 * 1024 * 1024);
            need_free_input = true;
        }
    } else {
        // Read stdin
        const stdin = std.io.getStdIn().reader();
        input_data = try stdin.readAllAlloc(allocator, 50 * 1024 * 1024);
        need_free_input = true;
    }

    var parser = CrewParser.init(allocator);
    const crews = try parser.parseText(input_data);
    defer parser.freeCrews(crews);

    const stdout = std.io.getStdOut().writer();

    if (output_labour_only) {
        const labour_items = try parser.extractUniqueLabourData(crews);
        defer parser.freeLabourData(labour_items);
        try std.json.stringify(labour_items, .{ .whitespace = .indent_2 }, stdout);
    } else {
        try std.json.stringify(crews, .{ .whitespace = .indent_2 }, stdout);
    }
    try stdout.print("\n", .{});
}

fn extractTextFromPdf(allocator: std.mem.Allocator, pdf_path: []const u8) ![]u8 {
    // We execute pdftotext -layout to extract the text stream
    var child = std.process.Child.init(&[_][]const u8{
        "pdftotext",
        "-layout",
        pdf_path,
        "-",
    }, allocator);
    child.stdout_behavior = .Pipe;
    child.stderr_behavior = .Inherit;

    try child.spawn();

    const stdout_stream = child.stdout orelse return error.PipeFailed;
    const text = try stdout_stream.reader().readAllAlloc(allocator, 50 * 1024 * 1024);
    errdefer allocator.free(text);

    _ = try child.wait();
    return text;
}

fn runHttpServer(allocator: std.mem.Allocator, port: u16) !void {
    const address = std.net.Address.parseIp4("0.0.0.0", port) catch unreachable;
    var net_server = try address.listen(.{ .reuse_address = true });
    defer net_server.deinit();

    const stdout = std.io.getStdOut().writer();
    try stdout.print("Zig Backend HTTP Server listening on http://0.0.0.0:{d}\n", .{port});

    while (true) {
        const conn = try net_server.accept();
        defer conn.stream.close();

        // Handle request with a connection buffer
        var read_buf: [65536]u8 = undefined;
        var http_server = std.http.Server.init(conn, &read_buf);

        while (http_server.state == .ready) {
            var request = http_server.receiveHead() catch |err| {
                if (err != error.HttpConnectionClosing) {
                    std.log.err("HTTP receiveHead error: {any}", .{err});
                }
                break;
            };

            const path = request.head.target;

            if (std.mem.eql(u8, path, "/api/status") or std.mem.eql(u8, path, "/health")) {
                const response_json = "{\"status\":\"ok\",\"service\":\"zig-crew-extractor\",\"version\":\"0.13.0\"}";
                try request.respond(response_json, .{
                    .extra_headers = &.{
                        .{ .name = "Content-Type", .value = "application/json" },
                        .{ .name = "Access-Control-Allow-Origin", .value = "*" },
                        .{ .name = "Access-Control-Allow-Methods", .value = "GET, POST, OPTIONS" },
                    },
                });
            } else if (std.mem.eql(u8, path, "/api/extract")) {
                if (request.head.method == .OPTIONS) {
                    try request.respond("", .{
                        .extra_headers = &.{
                            .{ .name = "Access-Control-Allow-Origin", .value = "*" },
                            .{ .name = "Access-Control-Allow-Methods", .value = "GET, POST, OPTIONS" },
                            .{ .name = "Access-Control-Allow-Headers", .value = "Content-Type, Content-Length" },
                        },
                    });
                } else if (request.head.method == .POST) {
                    // Read request body
                    var body_reader = try request.reader();
                    const body_data = try body_reader.readAllAlloc(allocator, 50 * 1024 * 1024);
                    defer allocator.free(body_data);

                    var parser = CrewParser.init(allocator);
                    const crews = try parser.parseText(body_data);
                    defer parser.freeCrews(crews);

                    var json_buf = std.ArrayList(u8).init(allocator);
                    defer json_buf.deinit();
                    try std.json.stringify(crews, .{ .whitespace = .indent_2 }, json_buf.writer());

                    try request.respond(json_buf.items, .{
                        .extra_headers = &.{
                            .{ .name = "Content-Type", .value = "application/json" },
                            .{ .name = "Access-Control-Allow-Origin", .value = "*" },
                        },
                    });
                } else {
                    try request.respond("Method Not Allowed", .{ .status = .method_not_allowed });
                }
            } else if (std.mem.eql(u8, path, "/api/extract-labour") or std.mem.eql(u8, path, "/api/extract-labor")) {
                if (request.head.method == .OPTIONS) {
                    try request.respond("", .{
                        .extra_headers = &.{
                            .{ .name = "Access-Control-Allow-Origin", .value = "*" },
                            .{ .name = "Access-Control-Allow-Methods", .value = "GET, POST, OPTIONS" },
                            .{ .name = "Access-Control-Allow-Headers", .value = "Content-Type, Content-Length" },
                        },
                    });
                } else if (request.head.method == .POST) {
                    var body_reader = try request.reader();
                    const body_data = try body_reader.readAllAlloc(allocator, 50 * 1024 * 1024);
                    defer allocator.free(body_data);

                    var parser = CrewParser.init(allocator);
                    const crews = try parser.parseText(body_data);
                    defer parser.freeCrews(crews);

                    const labour_items = try parser.extractUniqueLabourData(crews);
                    defer parser.freeLabourData(labour_items);

                    var json_buf = std.ArrayList(u8).init(allocator);
                    defer json_buf.deinit();
                    try std.json.stringify(labour_items, .{ .whitespace = .indent_2 }, json_buf.writer());

                    try request.respond(json_buf.items, .{
                        .extra_headers = &.{
                            .{ .name = "Content-Type", .value = "application/json" },
                            .{ .name = "Access-Control-Allow-Origin", .value = "*" },
                        },
                    });
                } else {
                    try request.respond("Method Not Allowed", .{ .status = .method_not_allowed });
                }
            } else {
                try request.respond("Not Found", .{ .status = .not_found });
            }
        }
    }
}
