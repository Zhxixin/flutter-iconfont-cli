"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const colors_1 = __importDefault(require("colors"));
const iconfont_json_1 = __importDefault(require("./iconfont.json"));
let cacheConfig;
const getConfig = () => {
    if (cacheConfig) {
        return cacheConfig;
    }
    const targetFile = path_1.default.resolve('iconfont.json');
    if (!fs_1.default.existsSync(targetFile)) {
        console.warn(colors_1.default.red('File "iconfont.json" doesn\'t exist, did you forget to generate it?'));
        process.exit(1);
    }
    const config = require(targetFile);
    if (!config.symbol_url || !/^(https?:)?\/\//.test(config.symbol_url)) {
        console.warn(colors_1.default.red('You are required to provide symbol_url'));
        process.exit(1);
    }
    if (config.symbol_url.indexOf('//') === 0) {
        config.symbol_url = 'http:' + config.symbol_url;
    }
    if (config.null_safety === undefined) {
        config.null_safety = false;
    }
    config.match_text_direction = config.match_text_direction === undefined ? true : config.match_text_direction;
    config.save_dir = config.save_dir || iconfont_json_1.default.save_dir;
    config.default_icon_size = config.default_icon_size || iconfont_json_1.default.default_icon_size;
    cacheConfig = config;
    return config;
};
exports.getConfig = getConfig;
