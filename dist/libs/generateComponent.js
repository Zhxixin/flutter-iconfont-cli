"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const xml2js_1 = require("xml2js");
const getTemplate_1 = require("./getTemplate");
const replace_1 = require("./replace");
const whitespace_1 = require("./whitespace");
// 定义支持生成的 SVG 标签列表
const ATTRIBUTE_FILL_MAP = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'g', 'defs', 'clipPath', 'linearGradient', 'stop'];
const generateComponent = (data, config) => __awaiter(void 0, void 0, void 0, function* () {
    const names = [];
    const saveDir = path_1.default.resolve(config.save_dir);
    // 本地 SVG 路径 (请确保这个路径是对的)
    const localSvgDir = path_1.default.join(process.cwd(), 'assets', 'replace_iconfont_svg');
    console.log(colors_1.default.blue('-------------------------------------------------------'));
    console.log(colors_1.default.blue(`[Info] Local SVG Search Path: ${localSvgDir}`));
    console.log(colors_1.default.blue('-------------------------------------------------------'));
    let cases = '';
    let stringToEnumCases = '';
    mkdirp_1.default.sync(saveDir);
    glob_1.default.sync(path_1.default.join(saveDir, '*')).forEach((file) => fs_1.default.unlinkSync(file));
    for (const item of data.svg.symbol) {
        const iconId = item.$.id;
        let iconIdAfterTrim = (0, lodash_1.snakeCase)(config.trim_icon_prefix
            ? iconId.replace(new RegExp(`^${config.trim_icon_prefix}(.+?)$`), '$1')
            : iconId);
        if (/^\d/.test(iconIdAfterTrim)) {
            iconIdAfterTrim = '_' + iconIdAfterTrim;
        }
        names.push(iconIdAfterTrim);
        // 智能查找本地文件
        let targetFilePath = path_1.default.join(localSvgDir, `${iconId}.svg`);
        let matchType = 'Exact Match';
        if (!fs_1.default.existsSync(targetFilePath)) {
            targetFilePath = path_1.default.join(localSvgDir, `${iconIdAfterTrim}.svg`);
            matchType = 'Trimmed Match';
        }
        let svgDataToRender = item;
        if (fs_1.default.existsSync(targetFilePath)) {
            try {
                const localContent = fs_1.default.readFileSync(targetFilePath, 'utf-8');
                // 解析本地 SVG (保留顺序)
                const parsedLocal = yield (0, xml2js_1.parseStringPromise)(localContent, {
                    explicitArray: true,
                    explicitChildren: true,
                    preserveChildrenOrder: true
                });
                if (parsedLocal.svg) {
                    console.log(colors_1.default.yellow(`[Local Override] Using local file (${matchType}): ${path_1.default.basename(targetFilePath)}`));
                    svgDataToRender = Object.assign(Object.assign({}, parsedLocal.svg), { $: Object.assign(Object.assign({}, item.$), { viewBox: parsedLocal.svg.$.viewBox || item.$.viewBox }), 
                        // 保留 $$ (子节点顺序数组)
                        $$: parsedLocal.svg.$$ });
                }
            }
            catch (e) {
                console.error(colors_1.default.red(`[Error] Failed to parse local SVG: ${iconId}`), e);
            }
        }
        cases += `${(0, whitespace_1.whitespace)(6)}case IconNames.${iconIdAfterTrim}:\n`;
        cases += `${(0, whitespace_1.whitespace)(8)}svgXml = '''${generateCase(svgDataToRender, 10)}''';\n`;
        cases += `${(0, whitespace_1.whitespace)(8)}break;\n`;
        stringToEnumCases += `${(0, whitespace_1.whitespace)(6)}case '${iconIdAfterTrim}':\n`;
        stringToEnumCases += `${(0, whitespace_1.whitespace)(8)}iconName = IconNames.${iconIdAfterTrim};\n`;
        stringToEnumCases += `${(0, whitespace_1.whitespace)(8)}break;\n`;
    }
    let iconFile = (0, getTemplate_1.getTemplate)(config.null_safety ? 'Icon.null.safety.dart' : 'Icon.dart');
    iconFile = (0, replace_1.replaceSize)(iconFile, config.default_icon_size);
    iconFile = (0, replace_1.replaceCases)(iconFile, cases);
    iconFile = (0, replace_1.replaceConvertCases)(iconFile, stringToEnumCases);
    iconFile = (0, replace_1.replaceNames)(iconFile, names);
    iconFile = (0, replace_1.replaceMatchTextDirection)(iconFile, config.match_text_direction);
    fs_1.default.writeFileSync(path_1.default.join(saveDir, 'icon_font.dart'), iconFile);
    console.log(`\n${colors_1.default.green('√')} All icons have putted into dir: ${colors_1.default.green(config.save_dir)}\n`);
});
exports.generateComponent = generateComponent;
const generateCase = (data, baseIdent) => {
    let template = `\n${(0, whitespace_1.whitespace)(baseIdent)}<svg viewBox="${data.$.viewBox}" xmlns="http://www.w3.org/2000/svg">\n`;
    // 如果有 defs，先生成 defs
    if (data.defs) {
        // 简单处理 defs，通常包含 clipPath
        // 这里省略复杂 defs 递归，如有需要可扩展
    }
    const context = {
        colorIndex: 0,
        baseIdent,
        colorMap: new Map(),
    };
    template += renderNodes(data, baseIdent + 2, context);
    template += `${(0, whitespace_1.whitespace)(baseIdent)}</svg>\n`;
    return template;
};
// 递归渲染函数 (严格顺序)
const renderNodes = (node, ident, context) => {
    let output = '';
    // 1. 优先处理有序子节点 $$
    if (node.$$) {
        node.$$.forEach((child) => {
            const domName = child['#name'];
            output += processSingleNode(domName, child, ident, context);
        });
        return output;
    }
    // 2. 回退处理
    for (const domName of Object.keys(node)) {
        if (domName === '$' || domName === '$$')
            continue;
        const nodes = Array.isArray(node[domName]) ? node[domName] : [node[domName]];
        nodes.forEach((subNode) => {
            output += processSingleNode(domName, subNode, ident, context);
        });
    }
    return output;
};
const processSingleNode = (domName, subNode, ident, context) => {
    // 过滤不支持的标签
    if (!ATTRIBUTE_FILL_MAP.includes(domName))
        return '';
    let html = '';
    // 处理 Group <g>
    if (domName === 'g') {
        html += `${(0, whitespace_1.whitespace)(ident)}<g${addAttribute(domName, subNode, context, ident)}>\n`;
        html += renderNodes(subNode, ident + 2, context);
        html += `${(0, whitespace_1.whitespace)(ident)}</g>\n`;
    }
    // 处理 ClipPath / Defs (如果有)
    else if (domName === 'defs' || domName === 'clipPath') {
        html += `${(0, whitespace_1.whitespace)(ident)}<${domName}${addAttribute(domName, subNode, context, ident)}>\n`;
        html += renderNodes(subNode, ident + 2, context);
        html += `${(0, whitespace_1.whitespace)(ident)}</${domName}>\n`;
    }
    // 处理常规形状
    else {
        html += `${(0, whitespace_1.whitespace)(ident)}<${domName}${addAttribute(domName, subNode, context, ident)} />\n`;
    }
    return html;
};
// 解析 style 字符串为对象
const parseStyle = (styleStr) => {
    const styleObj = {};
    if (!styleStr)
        return styleObj;
    const parts = styleStr.split(';');
    parts.forEach(part => {
        const [key, val] = part.split(':');
        if (key && val) {
            styleObj[key.trim()] = val.trim();
        }
    });
    return styleObj;
};
const addAttribute = (domName, sub, context, currentIdent) => {
    let template = '';
    if (sub && sub.$) {
        let attributes = sub.$;
        // 【新功能】合并 style 中的属性到 attributes
        if (attributes.style) {
            const styleAttrs = parseStyle(attributes.style);
            attributes = Object.assign(Object.assign({}, attributes), styleAttrs);
            delete attributes.style; // 处理完后删除 style 属性
        }
        // 【新增核心逻辑】如果标签没有 fill 也没有 stroke，给一个默认 fill
        // 这样能确保 getColor 逻辑被触发，从而让生成的 Icon 能响应 color 参数
        // 排除 g, defs, clipPath 等容器标签，只针对形状标签
        const nonShapeTags = ['g', 'defs', 'clipPath', 'linearGradient', 'stop', 'mask'];
        if (!nonShapeTags.includes(domName)) {
            if (!attributes.fill && !attributes.stroke) {
                // 给定默认颜色，后续循环会检测到这个属性并生成 getColor 代码
                attributes.fill = '#333333';
            }
        }
        const ignoreAttrs = ['id', 'class', 'data-name', 'xmlns', 'xmlns:xlink'];
        // 如果没有 fill/stroke，设置默认 (防止透明)
        // 但如果有了 opacity，就不强制设置了
        // 必须添加的基础属性
        if (!attributes['fill-opacity'])
            template += `\n${(0, whitespace_1.whitespace)(currentIdent + 2)}fill-opacity="$opacity"`;
        if (!attributes['stroke-opacity'])
            template += `\n${(0, whitespace_1.whitespace)(currentIdent + 2)}stroke-opacity="$opacity"`;
        for (const attributeName of Object.keys(attributes)) {
            if (ignoreAttrs.includes(attributeName))
                continue;
            const attrValue = attributes[attributeName];
            // 处理颜色 (fill 或 stroke)
            if (attributeName === 'fill' || attributeName === 'stroke') {
                if (!attrValue || attrValue.toLowerCase() === 'none') {
                    template += `\n${(0, whitespace_1.whitespace)(currentIdent + 2)}${attributeName}="${attrValue}"`;
                }
                else {
                    let idx = context.colorMap.get(attrValue);
                    if (idx === undefined) {
                        idx = context.colorIndex;
                        context.colorMap.set(attrValue, idx);
                        context.colorIndex++;
                    }
                    template += `\n${(0, whitespace_1.whitespace)(currentIdent + 2)}${attributeName}="''' + getColor(${idx}, color, colors, '${attrValue}') + '''"`;
                }
            }
            // 处理透明度 (opacity -> fill-opacity / stroke-opacity)
            // SVG 的 opacity 属性会同时影响 fill 和 stroke
            else if (attributeName === 'opacity') {
                // 这里我们简单处理，把 opacity 赋给 fill-opacity，配合上面的 $opacity 变量
                // 注意：Flutter SVG 可能需要特殊的处理，这里直接透传
                template += `\n${(0, whitespace_1.whitespace)(currentIdent + 2)}${attributeName}="${attrValue}"`;
            }
            // 直接透传 transform, clip-path 等
            else {
                template += `\n${(0, whitespace_1.whitespace)(currentIdent + 2)}${attributeName}="${attrValue}"`;
            }
        }
        template += ` fill-rule="evenodd"`;
    }
    else {
        // 没有任何属性时，补充基础 opacity
        template += `\n${(0, whitespace_1.whitespace)(currentIdent + 2)}fill-opacity="$opacity" fill-rule="evenodd" stroke-opacity="$opacity"`;
    }
    return template;
};
