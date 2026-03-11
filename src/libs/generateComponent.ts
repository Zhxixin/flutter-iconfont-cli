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
  
  // 本地 SVG 路径
  const localSvgDir = path.join(process.cwd(), 'assets', 'replace_iconfont_svg');

  console.log(colors.blue('-------------------------------------------------------'));
  console.log(colors.blue(`[Info] Local SVG Search Path: ${localSvgDir}`));
  console.log(colors.blue('-------------------------------------------------------'));

  let cases: string = '';
  let stringToEnumCases = '';

  mkdirp.sync(saveDir);
  glob.sync(path.join(saveDir, '*')).forEach((file) => fs.unlinkSync(file));

  // 1. 获取所有本地 SVG 文件列表，并创建一个集合来记录已处理的文件
  let allLocalFiles: string[] = [];
  const processedLocalFiles = new Set<string>(); 

  if (fs.existsSync(localSvgDir)) {
      allLocalFiles = fs.readdirSync(localSvgDir).filter(file => file.toLowerCase().endsWith('.svg'));
  }

  // Helper: 处理 Icon ID 的命名规范
  const processIconId = (rawId: string) => {
      let trimmed = snakeCase(config.trim_icon_prefix
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
    let targetFilePath = path.join(localSvgDir, targetFileName);
    let matchType = 'Exact Match';

    // 尝试去前缀匹配
    if (!fs.existsSync(targetFilePath)) {
        targetFileName = `${iconIdAfterTrim}.svg`;
        targetFilePath = path.join(localSvgDir, targetFileName);
        matchType = 'Trimmed Match';
    }

    let svgDataToRender = item; 

    if (fs.existsSync(targetFilePath)) {
      try {
        processedLocalFiles.add(targetFileName);

        const localContent = fs.readFileSync(targetFilePath, 'utf-8');
        const parsedLocal = await parseStringPromise(localContent, { 
            explicitArray: true,
            explicitChildren: true,
            preserveChildrenOrder: true 
        });
        
        if (parsedLocal.svg) {
            console.log(colors.yellow(`[Local Override] Using local file (${matchType}): ${targetFileName}`));
            svgDataToRender = {
                ...parsedLocal.svg, 
                $: {
                    ...item.$, 
                    viewBox: parsedLocal.svg.$.viewBox || item.$.viewBox 
                },
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

  // ==========================================
  // 阶段二：处理新增的本地 SVG
  // ==========================================
  const newIcons = allLocalFiles.filter(file => !processedLocalFiles.has(file));
  
  if (newIcons.length > 0) {
      console.log(colors.green(`-------------------------------------------------------`));
      console.log(colors.green(`[Info] Found ${newIcons.length} new icons in local folder:`));
  }

  for (const fileName of newIcons) {
      const rawId = path.parse(fileName).name; 
      const iconIdAfterTrim = processIconId(rawId);

      if (names.includes(iconIdAfterTrim)) {
          console.warn(colors.yellow(`[Warn] Skipping duplicate icon name: ${iconIdAfterTrim} (${fileName})`));
          continue;
      }

      names.push(iconIdAfterTrim);
      console.log(colors.green(`  + Adding new icon: ${iconIdAfterTrim}`));

      const targetFilePath = path.join(localSvgDir, fileName);
      try {
          const localContent = fs.readFileSync(targetFilePath, 'utf-8');
          const parsedLocal = await parseStringPromise(localContent, { 
              explicitArray: true,
              explicitChildren: true,
              preserveChildrenOrder: true 
          });

          if (parsedLocal.svg) {
              const svgDataToRender = {
                  ...parsedLocal.svg,
                  $: {
                      viewBox: parsedLocal.svg.$.viewBox || '0 0 1024 1024'
                  },
                  $$: parsedLocal.svg.$$
              };

              cases += `${whitespace(6)}case IconNames.${iconIdAfterTrim}:\n`;
              cases += `${whitespace(8)}svgXml = '''${generateCase(svgDataToRender, 10)}''';\n`;
              cases += `${whitespace(8)}break;\n`;

              stringToEnumCases += `${whitespace(6)}case '${iconIdAfterTrim}':\n`;
              stringToEnumCases += `${whitespace(8)}iconName = IconNames.${iconIdAfterTrim};\n`;
              stringToEnumCases += `${whitespace(8)}break;\n`;
          }
      } catch (e) {
          console.error(colors.red(`[Error] Failed to parse new local SVG: ${fileName}`), e);
      }
  }

  if (newIcons.length > 0) {
    console.log(colors.green(`-------------------------------------------------------`));
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
  // 【关键修改】在根节点增加 opacity="$opacity" 和 shape-rendering="geometricPrecision"
  let template = `\n${whitespace(baseIdent)}<svg viewBox="${data.$.viewBox}" xmlns="http://www.w3.org/2000/svg" opacity="$opacity" shape-rendering="geometricPrecision">\n`;
  
  if (data.defs) {
      // defs 处理
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

// 递归渲染函数
const renderNodes = (node: any, ident: number, context: Context): string => {
  let output = '';

  if (node.$$) {
    node.$$.forEach((child: any) => {
      const domName = child['#name'];
      output += processSingleNode(domName, child, ident, context);
    });
    return output;
  }

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
    if (!ATTRIBUTE_FILL_MAP.includes(domName)) return '';

    let html = '';
    
    if (domName === 'g') {
        html += `${whitespace(ident)}<g${addAttribute(domName, subNode, context, ident)}>\n`;
        html += renderNodes(subNode, ident + 2, context); 
        html += `${whitespace(ident)}</g>\n`;
    } 
    else if (domName === 'defs' || domName === 'clipPath') {
         html += `${whitespace(ident)}<${domName}${addAttribute(domName, subNode, context, ident)}>\n`;
         html += renderNodes(subNode, ident + 2, context);
         html += `${whitespace(ident)}</${domName}>\n`;
    }
    else {
        html += `${whitespace(ident)}<${domName}${addAttribute(domName, subNode, context, ident)} />\n`;
    }
    return html;
}

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
    
    // 1. 合并 style 中的属性
    if (attributes.style) {
        const styleAttrs = parseStyle(attributes.style);
        attributes = { ...attributes, ...styleAttrs };
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
      if (ignoreAttrs.includes(attributeName)) continue;

      const attrValue = attributes[attributeName];

      // 处理颜色 (无白色保护，全部 map)
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
      // 处理透明度 (保留原值)
      else if (attributeName === 'opacity' || attributeName === 'fill-opacity' || attributeName === 'stroke-opacity') {
         template += `\n${whitespace(currentIdent + 2)}${attributeName}="${attrValue}"`;
      }
      // 【关键逻辑】检测原图是否自带 fill-rule
      else if (attributeName === 'fill-rule') {
         hasFillRule = true; // 标记已存在
         template += `\n${whitespace(currentIdent + 2)}${attributeName}="${attrValue}"`;
      }
      // 其他属性透传
      else {
        template += `\n${whitespace(currentIdent + 2)}${attributeName}="${attrValue}"`;
      }
    }
    
    // 3. 【智能填充规则】只有当原图没有 fill-rule 时，才补充 evenodd
    if (!hasFillRule) {
        template+=` fill-rule="evenodd"`;
    }

  } else {
      // 没有任何属性时，默认补充 fill-rule
      template += `\n${whitespace(currentIdent + 2)}fill-rule="evenodd"`;
  }

  return template;
};