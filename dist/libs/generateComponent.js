"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateComponent = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const mkdirp_1 = __importDefault(require("mkdirp"));
const glob_1 = __importDefault(require("glob"));
const colors_1 = __importDefault(require("colors"));
const lodash_1 = require("lodash");
const getTemplate_1 = require("./getTemplate");
const replace_1 = require("./replace");
const whitespace_1 = require("./whitespace");
const ATTRIBUTE_FILL_MAP = ['path'];
const generateComponent = (data, config) => {
    const names = [];
    const saveDir = path_1.default.resolve(config.save_dir);
    let cases = '';
    let stringToEnumCases = '';
    mkdirp_1.default.sync(saveDir);
    glob_1.default.sync(path_1.default.join(saveDir, '*')).forEach((file) => fs_1.default.unlinkSync(file));
    data.svg.symbol.forEach((item) => {
        const iconId = item.$.id;
        let iconIdAfterTrim = (0, lodash_1.snakeCase)(config.trim_icon_prefix
            ? iconId.replace(new RegExp(`^${config.trim_icon_prefix}(.+?)$`), '$1')
            : iconId);
        // dart enum doesn't support keyword with digit prefix
        if (/^\d/.test(iconIdAfterTrim)) {
            iconIdAfterTrim = '_' + iconIdAfterTrim;
        }
        names.push(iconIdAfterTrim);
        cases += `${(0, whitespace_1.whitespace)(6)}case IconNames.${iconIdAfterTrim}:\n`;
        cases += `${(0, whitespace_1.whitespace)(8)}svgXml = '''${generateCase(item, 10)}${(0, whitespace_1.whitespace)(8)}''';\n`;
        cases += `${(0, whitespace_1.whitespace)(8)}break;\n`;
        stringToEnumCases += `${(0, whitespace_1.whitespace)(6)}case '${iconIdAfterTrim}':\n`;
        stringToEnumCases += `${(0, whitespace_1.whitespace)(8)}iconName = IconNames.${iconIdAfterTrim};\n`;
        stringToEnumCases += `${(0, whitespace_1.whitespace)(8)}break;\n`;
    });
    let iconFile = (0, getTemplate_1.getTemplate)(config.null_safety ? 'Icon.null.safety.dart' : 'Icon.dart');
    iconFile = (0, replace_1.replaceSize)(iconFile, config.default_icon_size);
    iconFile = (0, replace_1.replaceCases)(iconFile, cases);
    iconFile = (0, replace_1.replaceConvertCases)(iconFile, stringToEnumCases);
    iconFile = (0, replace_1.replaceNames)(iconFile, names);
    iconFile = (0, replace_1.replaceMatchTextDirection)(iconFile, config.match_text_direction);
    fs_1.default.writeFileSync(path_1.default.join(saveDir, 'icon_font.dart'), iconFile);
    console.log(`\n${colors_1.default.green('√')} All icons have putted into dir: ${colors_1.default.green(config.save_dir)}\n`);
};
exports.generateComponent = generateComponent;
const generateCase = (data, baseIdent) => {
    let template = `\n${(0, whitespace_1.whitespace)(baseIdent)}<svg viewBox="${data.$.viewBox}" xmlns="http://www.w3.org/2000/svg">\n`;
    for (const domName of Object.keys(data)) {
        if (domName === '$') {
            continue;
        }
        if (!domName) {
            console.error(colors_1.default.red(`Unable to transform dom "${domName}"`));
            process.exit(1);
        }
        const counter = {
            colorIndex: 0,
            baseIdent,
        };
        if (data[domName].$) {
            template += `${(0, whitespace_1.whitespace)(baseIdent + 2)}<${domName}${addAttribute(domName, data[domName], counter)}\n${(0, whitespace_1.whitespace)(baseIdent + 2)}${(0, whitespace_1.whitespace)(baseIdent - 8)}fill-opacity="$opacity" \n${(0, whitespace_1.whitespace)(baseIdent)}/>\n`;
        }
        else if (Array.isArray(data[domName])) {
            data[domName].forEach((sub) => {
                template += `${(0, whitespace_1.whitespace)(baseIdent + 2)}<${domName}${addAttribute(domName, sub, counter)}\n${(0, whitespace_1.whitespace)(baseIdent + 2)}${(0, whitespace_1.whitespace)(baseIdent - 8)}fill-opacity="$opacity" \n${(0, whitespace_1.whitespace)(baseIdent)}/>\n`;
            });
        }
    }
    template += `${(0, whitespace_1.whitespace)(baseIdent)}</svg>\n`;
    return template;
};
const addAttribute = (domName, sub, counter) => {
    let template = '';
    if (sub && sub.$) {
        if (ATTRIBUTE_FILL_MAP.includes(domName)) {
            // Set default color same as in iconfont.cn
            // And create placeholder to inject color by user's behavior
            sub.$.fill = sub.$.fill || '#333333';
        }
        for (const attributeName of Object.keys(sub.$)) {
            if (attributeName === 'fill') {
                template += `\n${(0, whitespace_1.whitespace)(counter.baseIdent + 4)}${attributeName}="''' + getColor(${counter.colorIndex}, color, colors, '${sub.$[attributeName]}') + '''"`;
                counter.colorIndex += 1;
            }
            else {
                template += `\n${(0, whitespace_1.whitespace)(counter.baseIdent + 4)}${attributeName}="${sub.$[attributeName]}"`;
            }
        }
    }
    return template;
};
