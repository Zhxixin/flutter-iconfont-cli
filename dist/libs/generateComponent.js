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
    // 本地 SVG 路径
    const localSvgDir = path_1.default.join(process.cwd(), 'assets', 'replace_iconfont_svg');
    console.log(colors_1.default.blue('-------------------------------------------------------'));
    console.log(colors_1.default.blue(`[Info] Local SVG Search Path: ${localSvgDir}`));
    console.log(colors_1.default.blue('-------------------------------------------------------'));
    let cases = '';
    let stringToEnumCases = '';
    mkdirp_1.default.sync(saveDir);
    glob_1.default.sync(path_1.default.join(saveDir, '*')).forEach((file) => fs_1.default.unlinkSync(file));
    // 1. 获取所有本地 SVG 文件列表，并创建一个集合来记录已处理的文件
    let allLocalFiles = [];
    const processedLocalFiles = new Set();
    if (fs_1.default.existsSync(localSvgDir)) {
        allLocalFiles = fs_1.default.readdirSync(localSvgDir).filter(file => file.toLowerCase().endsWith('.svg'));
    }
    // Helper: 处理 Icon ID 的命名规范
    const processIconId = (rawId) => {
        let trimmed = (0, lodash_1.snakeCase)(config.trim_icon_prefix
            ? rawId.replace(new RegExp(`^${config.trim_icon_prefix}(.+?)$`), '$1')
            : rawId);
        if (/^\d/.test(trimmed)) {
            trimmed = '_' + trimmed;
        }
        return trimmed;
    };
    // ==========================================
    // 阶段一：遍历 Iconfont 数据
    // ==========================================
    for (const item of data.svg.symbol) {
        const iconId = item.$.id;
        const iconIdAfterTrim = processIconId(iconId);
        names.push(iconIdAfterTrim);
        // 智能查找本地文件
        let targetFileName = `${iconId}.svg`;
        let targetFilePath = path_1.default.join(localSvgDir, targetFileName);
        let matchType = 'Exact Match';
        // 尝试去前缀匹配
        if (!fs_1.default.existsSync(targetFilePath)) {
            targetFileName = `${iconIdAfterTrim}.svg`;
            targetFilePath = path_1.default.join(localSvgDir, targetFileName);
            matchType = 'Trimmed Match';
        }
        let svgDataToRender = item;
        if (fs_1.default.existsSync(targetFilePath)) {
            try {
                processedLocalFiles.add(targetFileName);
                const localContent = fs_1.default.readFileSync(targetFilePath, 'utf-8');
                const parsedLocal = yield (0, xml2js_1.parseStringPromise)(localContent, {
                    explicitArray: true,
                    explicitChildren: true,
                    preserveChildrenOrder: true
                });
                if (parsedLocal.svg) {
                    console.log(colors_1.default.yellow(`[Local Override] Using local file (${matchType}): ${targetFileName}`));
                    svgDataToRender = Object.assign(Object.assign({}, parsedLocal.svg), { $: Object.assign(Object.assign({}, item.$), { viewBox: parsedLocal.svg.$.viewBox || item.$.viewBox }), $$: parsedLocal.svg.$$ });
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
    // ==========================================
    // 阶段二：处理新增的本地 SVG
    // ==========================================
    const newIcons = allLocalFiles.filter(file => !processedLocalFiles.has(file));
    if (newIcons.length > 0) {
        console.log(colors_1.default.green(`-------------------------------------------------------`));
        console.log(colors_1.default.green(`[Info] Found ${newIcons.length} new icons in local folder:`));
    }
    for (const fileName of newIcons) {
        const rawId = path_1.default.parse(fileName).name;
        const iconIdAfterTrim = processIconId(rawId);
        if (names.includes(iconIdAfterTrim)) {
            console.warn(colors_1.default.yellow(`[Warn] Skipping duplicate icon name: ${iconIdAfterTrim} (${fileName})`));
            continue;
        }
        names.push(iconIdAfterTrim);
        console.log(colors_1.default.green(`  + Adding new icon: ${iconIdAfterTrim}`));
        const targetFilePath = path_1.default.join(localSvgDir, fileName);
        try {
            const localContent = fs_1.default.readFileSync(targetFilePath, 'utf-8');
            const parsedLocal = yield (0, xml2js_1.parseStringPromise)(localContent, {
                explicitArray: true,
                explicitChildren: true,
                preserveChildrenOrder: true
            });
            if (parsedLocal.svg) {
                const svgDataToRender = Object.assign(Object.assign({}, parsedLocal.svg), { $: {
                        viewBox: parsedLocal.svg.$.viewBox || '0 0 1024 1024'
                    }, $$: parsedLocal.svg.$$ });
                cases += `${(0, whitespace_1.whitespace)(6)}case IconNames.${iconIdAfterTrim}:\n`;
                cases += `${(0, whitespace_1.whitespace)(8)}svgXml = '''${generateCase(svgDataToRender, 10)}''';\n`;
                cases += `${(0, whitespace_1.whitespace)(8)}break;\n`;
                stringToEnumCases += `${(0, whitespace_1.whitespace)(6)}case '${iconIdAfterTrim}':\n`;
                stringToEnumCases += `${(0, whitespace_1.whitespace)(8)}iconName = IconNames.${iconIdAfterTrim};\n`;
                stringToEnumCases += `${(0, whitespace_1.whitespace)(8)}break;\n`;
            }
        }
        catch (e) {
            console.error(colors_1.default.red(`[Error] Failed to parse new local SVG: ${fileName}`), e);
        }
    }
    if (newIcons.length > 0) {
        console.log(colors_1.default.green(`-------------------------------------------------------`));
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
    // 【关键修改】在根节点增加 opacity="$opacity" 和 shape-rendering="geometricPrecision"
    let template = `\n${(0, whitespace_1.whitespace)(baseIdent)}<svg viewBox="${data.$.viewBox}" xmlns="http://www.w3.org/2000/svg" opacity="$opacity" shape-rendering="geometricPrecision">\n`;
    if (data.defs) {
        // defs 处理
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
// 递归渲染函数
const renderNodes = (node, ident, context) => {
    let output = '';
    if (node.$$) {
        node.$$.forEach((child) => {
            const domName = child['#name'];
            output += processSingleNode(domName, child, ident, context);
        });
        return output;
    }
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
    if (!ATTRIBUTE_FILL_MAP.includes(domName))
        return '';
    let html = '';
    if (domName === 'g') {
        html += `${(0, whitespace_1.whitespace)(ident)}<g${addAttribute(domName, subNode, context, ident)}>\n`;
        html += renderNodes(subNode, ident + 2, context);
        html += `${(0, whitespace_1.whitespace)(ident)}</g>\n`;
    }
    else if (domName === 'defs' || domName === 'clipPath') {
        html += `${(0, whitespace_1.whitespace)(ident)}<${domName}${addAttribute(domName, subNode, context, ident)}>\n`;
        html += renderNodes(subNode, ident + 2, context);
        html += `${(0, whitespace_1.whitespace)(ident)}</${domName}>\n`;
    }
    else {
        html += `${(0, whitespace_1.whitespace)(ident)}<${domName}${addAttribute(domName, subNode, context, ident)} />\n`;
    }
    return html;
};
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
        // 1. 合并 style 中的属性
        if (attributes.style) {
            const styleAttrs = parseStyle(attributes.style);
            attributes = Object.assign(Object.assign({}, attributes), styleAttrs);
            delete attributes.style;
        }
        // 2. 无色填充逻辑
        const nonShapeTags = ['g', 'defs', 'clipPath', 'linearGradient', 'stop', 'mask'];
        if (!nonShapeTags.includes(domName)) {
            if (!attributes.fill && !attributes.stroke) {
                attributes.fill = '#333333';
            }
        }
        const ignoreAttrs = ['id', 'class', 'data-name', 'xmlns', 'xmlns:xlink'];
        // 【关键变量】标记是否已经包含 fill-rule
        let hasFillRule = false;
        for (const attributeName of Object.keys(attributes)) {
            if (ignoreAttrs.includes(attributeName))
                continue;
            const attrValue = attributes[attributeName];
            // 处理颜色 (无白色保护，全部 map)
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
            // 处理透明度 (保留原值)
            else if (attributeName === 'opacity' || attributeName === 'fill-opacity' || attributeName === 'stroke-opacity') {
                template += `\n${(0, whitespace_1.whitespace)(currentIdent + 2)}${attributeName}="${attrValue}"`;
            }
            // 【关键逻辑】检测原图是否自带 fill-rule
            else if (attributeName === 'fill-rule') {
                hasFillRule = true; // 标记已存在
                template += `\n${(0, whitespace_1.whitespace)(currentIdent + 2)}${attributeName}="${attrValue}"`;
            }
            // 其他属性透传
            else {
                template += `\n${(0, whitespace_1.whitespace)(currentIdent + 2)}${attributeName}="${attrValue}"`;
            }
        }
        // 3. 【智能填充规则】只有当原图没有 fill-rule 时，才补充 evenodd
        if (!hasFillRule) {
            template += ` fill-rule="evenodd"`;
        }
    }
    else {
        // 没有任何属性时，默认补充 fill-rule
        template += `\n${(0, whitespace_1.whitespace)(currentIdent + 2)}fill-rule="evenodd"`;
    }
    return template;
};
