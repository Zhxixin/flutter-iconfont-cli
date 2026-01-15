import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import glob from 'glob';
import colors from 'colors';
import { snakeCase } from 'lodash';
import { parseStringPromise } from 'xml2js';
import { XmlData } from 'iconfont-parser';
import { Config } from './getConfig';
import { getTemplate } from './getTemplate';
import {
  replaceCases,
  replaceConvertCases,
  replaceMatchTextDirection,
  replaceNames,
  replaceSize,
} from './replace';
import { whitespace } from './whitespace';

// 定义支持生成的 SVG 标签列表
const ATTRIBUTE_FILL_MAP = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'g', 'defs', 'clipPath', 'linearGradient', 'stop'];

// 上下文接口
interface Context {
  colorIndex: number;
  baseIdent: number;
  colorMap: Map<string, number>;
}

export const generateComponent = async (data: XmlData, config: Config) => {
  const names: string[] = [];
  const saveDir = path.resolve(config.save_dir);
  
  // 本地 SVG 路径 (请确保这个路径是对的)
  const localSvgDir = path.join(process.cwd(), 'assets', 'replace_iconfont_svg');

  console.log(colors.blue('-------------------------------------------------------'));
  console.log(colors.blue(`[Info] Local SVG Search Path: ${localSvgDir}`));
  console.log(colors.blue('-------------------------------------------------------'));

  let cases: string = '';
  let stringToEnumCases = '';

  mkdirp.sync(saveDir);
  glob.sync(path.join(saveDir, '*')).forEach((file) => fs.unlinkSync(file));

  for (const item of data.svg.symbol) {
    const iconId = item.$.id;
    let iconIdAfterTrim = snakeCase(config.trim_icon_prefix
      ? iconId.replace(new RegExp(`^${config.trim_icon_prefix}(.+?)$`), '$1')
      : iconId);

    if (/^\d/.test(iconIdAfterTrim)) {
      iconIdAfterTrim = '_' + iconIdAfterTrim;
    }

    names.push(iconIdAfterTrim);

    // 智能查找本地文件
    let targetFilePath = path.join(localSvgDir, `${iconId}.svg`);
    let matchType = 'Exact Match';

    if (!fs.existsSync(targetFilePath)) {
        targetFilePath = path.join(localSvgDir, `${iconIdAfterTrim}.svg`);
        matchType = 'Trimmed Match';
    }

    let svgDataToRender = item; 

    if (fs.existsSync(targetFilePath)) {
      try {
        const localContent = fs.readFileSync(targetFilePath, 'utf-8');
        // 解析本地 SVG (保留顺序)
        const parsedLocal = await parseStringPromise(localContent, { 
            explicitArray: true,
            explicitChildren: true,
            preserveChildrenOrder: true 
        });
        
        if (parsedLocal.svg) {
            console.log(colors.yellow(`[Local Override] Using local file (${matchType}): ${path.basename(targetFilePath)}`));
            svgDataToRender = {
                ...parsedLocal.svg, 
                $: {
                    ...item.$, 
                    viewBox: parsedLocal.svg.$.viewBox || item.$.viewBox 
                },
                // 保留 $$ (子节点顺序数组)
                $$: parsedLocal.svg.$$ 
            };
        }
      } catch (e) {
        console.error(colors.red(`[Error] Failed to parse local SVG: ${iconId}`), e);
      }
    }

    cases += `${whitespace(6)}case IconNames.${iconIdAfterTrim}:\n`;
    cases += `${whitespace(8)}svgXml = '''${generateCase(svgDataToRender, 10)}''';\n`;
    cases += `${whitespace(8)}break;\n`;

    stringToEnumCases += `${whitespace(6)}case '${iconIdAfterTrim}':\n`;
    stringToEnumCases += `${whitespace(8)}iconName = IconNames.${iconIdAfterTrim};\n`;
    stringToEnumCases += `${whitespace(8)}break;\n`;
  }

  let iconFile = getTemplate(config.null_safety ? 'Icon.null.safety.dart' : 'Icon.dart');

  iconFile = replaceSize(iconFile, config.default_icon_size);
  iconFile = replaceCases(iconFile, cases);
  iconFile = replaceConvertCases(iconFile, stringToEnumCases);
  iconFile = replaceNames(iconFile, names);
  iconFile = replaceMatchTextDirection(iconFile, config.match_text_direction);
  fs.writeFileSync(path.join(saveDir, 'icon_font.dart'), iconFile);

  console.log(`\n${colors.green('√')} All icons have putted into dir: ${colors.green(config.save_dir)}\n`);
};

const generateCase = (data: any, baseIdent: number) => {
  let template = `\n${whitespace(baseIdent)}<svg viewBox="${data.$.viewBox}" xmlns="http://www.w3.org/2000/svg">\n`;
  // 如果有 defs，先生成 defs
  if (data.defs) {
      // 简单处理 defs，通常包含 clipPath
      // 这里省略复杂 defs 递归，如有需要可扩展
  }

  const context: Context = {
    colorIndex: 0,
    baseIdent,
    colorMap: new Map(),
  };

  template += renderNodes(data, baseIdent + 2, context);

  template += `${whitespace(baseIdent)}</svg>\n`;
  return template;
};

// 递归渲染函数 (严格顺序)
const renderNodes = (node: any, ident: number, context: Context): string => {
  let output = '';

  // 1. 优先处理有序子节点 $$
  if (node.$$) {
    node.$$.forEach((child: any) => {
      const domName = child['#name'];
      output += processSingleNode(domName, child, ident, context);
    });
    return output;
  }

  // 2. 回退处理
  for (const domName of Object.keys(node)) {
    if (domName === '$' || domName === '$$') continue; 
    const nodes = Array.isArray(node[domName]) ? node[domName] : [node[domName]];
    nodes.forEach((subNode: any) => {
       output += processSingleNode(domName, subNode, ident, context);
    });
  }

  return output;
};

const processSingleNode = (domName: string, subNode: any, ident: number, context: Context) => {
    // 过滤不支持的标签
    if (!ATTRIBUTE_FILL_MAP.includes(domName)) return '';

    let html = '';
    
    // 处理 Group <g>
    if (domName === 'g') {
        html += `${whitespace(ident)}<g${addAttribute(domName, subNode, context, ident)}>\n`;
        html += renderNodes(subNode, ident + 2, context); 
        html += `${whitespace(ident)}</g>\n`;
    } 
    // 处理 ClipPath / Defs (如果有)
    else if (domName === 'defs' || domName === 'clipPath') {
         html += `${whitespace(ident)}<${domName}${addAttribute(domName, subNode, context, ident)}>\n`;
         html += renderNodes(subNode, ident + 2, context);
         html += `${whitespace(ident)}</${domName}>\n`;
    }
    // 处理常规形状
    else {
        html += `${whitespace(ident)}<${domName}${addAttribute(domName, subNode, context, ident)} />\n`;
    }
    return html;
}

// 解析 style 字符串为对象
const parseStyle = (styleStr: string): any => {
    const styleObj: any = {};
    if (!styleStr) return styleObj;
    
    const parts = styleStr.split(';');
    parts.forEach(part => {
        const [key, val] = part.split(':');
        if (key && val) {
            styleObj[key.trim()] = val.trim();
        }
    });
    return styleObj;
}

const addAttribute = (domName: string, sub: any, context: Context, currentIdent: number) => {
  let template = '';

  if (sub && sub.$) {
    let attributes = sub.$ as any; 
    
    // 合并 style 中的属性到 attributes
    if (attributes.style) {
        const styleAttrs = parseStyle(attributes.style);
        attributes = { ...attributes, ...styleAttrs };
        delete attributes.style; // 处理完后删除 style 属性
    }

    // 如果标签没有 fill 也没有 stroke，给一个默认 fill
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
    if (!attributes['fill-opacity']) template += `\n${whitespace(currentIdent + 2)}fill-opacity="$opacity"`;
    if (!attributes['stroke-opacity']) template += `\n${whitespace(currentIdent + 2)}stroke-opacity="$opacity"`;

    for (const attributeName of Object.keys(attributes)) {
      if (ignoreAttrs.includes(attributeName)) continue;

      const attrValue = attributes[attributeName];

      // 处理颜色 (fill 或 stroke)
      if (attributeName === 'fill' || attributeName === 'stroke') {
        if (!attrValue || attrValue.toLowerCase() === 'none') {
          template += `\n${whitespace(currentIdent + 2)}${attributeName}="${attrValue}"`;
        } else {
          let idx = context.colorMap.get(attrValue);
          if (idx === undefined) {
            idx = context.colorIndex;
            context.colorMap.set(attrValue, idx);
            context.colorIndex++;
          }
          template += `\n${whitespace(currentIdent + 2)}${attributeName}="''' + getColor(${idx}, color, colors, '${attrValue}') + '''"`;
        }
      } 
      // 处理透明度 (opacity -> fill-opacity / stroke-opacity)
      // SVG 的 opacity 属性会同时影响 fill 和 stroke
      else if (attributeName === 'opacity') {
         // 这里我们简单处理，把 opacity 赋给 fill-opacity，配合上面的 $opacity 变量
         // 注意：Flutter SVG 可能需要特殊的处理，这里直接透传
         template += `\n${whitespace(currentIdent + 2)}${attributeName}="${attrValue}"`;
      }
      // 直接透传 transform, clip-path 等
      else {
        template += `\n${whitespace(currentIdent + 2)}${attributeName}="${attrValue}"`;
      }
    }
    template+=` fill-rule="evenodd"`;
  } else {
      // 没有任何属性时，补充基础 opacity
      template += `\n${whitespace(currentIdent + 2)}fill-opacity="$opacity" fill-rule="evenodd" stroke-opacity="$opacity"`;
  }

  return template;
};