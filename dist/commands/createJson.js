#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const colors_1 = __importDefault(require("colors"));
const targetFile = path_1.default.resolve('iconfont.json');
if (fs_1.default.existsSync(targetFile)) {
    console.error(colors_1.default.red('File "iconfont.json" was created before.'));
}
else {
    fs_1.default.copyFileSync(path_1.default.join(__dirname, '../libs/iconfont.json'), targetFile);
    console.log(colors_1.default.green('File "iconfont.json" is created now. We recommend you add it to version control.'));
}
