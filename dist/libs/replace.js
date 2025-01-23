"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceMatchTextDirection = exports.replaceNames = exports.replaceConvertCases = exports.replaceCases = exports.replaceSize = void 0;
const replaceSize = (content, size) => {
    return content.replace(/#size#/g, String(size));
};
exports.replaceSize = replaceSize;
const replaceCases = (content, cases) => {
    return content.replace(/#cases#/g, cases);
};
exports.replaceCases = replaceCases;
const replaceConvertCases = (content, cases) => {
    return content.replace(/#convertCases#/g, cases);
};
exports.replaceConvertCases = replaceConvertCases;
const replaceNames = (content, names) => {
    return content.replace(/#names#/g, names.join(', '));
};
exports.replaceNames = replaceNames;
const replaceMatchTextDirection = (content, names) => {
    return content.replace(/#matchTextDirection#/g, names ? 'true' : 'false');
};
exports.replaceMatchTextDirection = replaceMatchTextDirection;
