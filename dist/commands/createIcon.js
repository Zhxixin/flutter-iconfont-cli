#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const colors_1 = __importDefault(require("colors"));
const getConfig_1 = require("../libs/getConfig");
const iconfont_parser_1 = require("iconfont-parser");
const generateComponent_1 = require("../libs/generateComponent");
const config = (0, getConfig_1.getConfig)();
(0, iconfont_parser_1.fetchXml)(config.symbol_url).then((result) => {
    (0, generateComponent_1.generateComponent)(result, config);
}).catch((e) => {
    console.error(colors_1.default.red(e.message || 'Unknown Error'));
    process.exit(1);
});
