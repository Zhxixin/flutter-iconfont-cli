#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const colors_1 = __importDefault(require("colors"));
console.log([
    '',
    'Usage:',
    '',
    '    ' + colors_1.default.yellow('npx iconfont-init') + '       : generate config file',
    '    ' + colors_1.default.yellow('npx iconfont-flutter') + '    : generate icon components',
    '',
].join('\n'));
