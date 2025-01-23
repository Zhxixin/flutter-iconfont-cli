#!/usr/bin/env node

import { exec } from "child_process";
import * as path from "path";
import * as colors from "colors";
const args = process.argv.slice(2); // 获取命令行参数
const command = args[0];

switch (command) {
    case "init":
        console.log(colors.yellow("Executing createJson.ts..."));
        exec(
            `node ${path.resolve(__dirname, "./commands/createJson.js")}`,
            (error, stdout, stderr) => {
                if (error) {
                    console.error(colors.red(`Error: ${error.message}`));
                    return;
                }
                if (stderr) {
                    console.error(colors.red(`Stderr: ${stderr}`));
                    return;
                }
                console.log(colors.green(stdout));
            }
        );
        break;

    case undefined:
        console.log(colors.yellow("Executing createIcon.ts..."));
        exec(
            `node ${path.resolve(__dirname, "./commands/createIcon.js")}`,
            (error, stdout, stderr) => {
                if (error) {
                    console.error(colors.red(`Error: ${error.message}`));
                    return;
                }
                if (stderr) {
                    console.error(colors.red(`Stderr: ${stderr}`));
                    return;
                }
                console.log(colors.green(stdout));
            }
        );
        break;

    default:
        console.error(colors.red(`Unknown command: ${command}`));
        console.log("Usage:");
        console.log("  iconfont-cli init      Execute createJson.ts");
        console.log("  iconfont-cli           Execute createIcon.ts");
        break;
}
