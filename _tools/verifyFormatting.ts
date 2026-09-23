// verifyFormatting.ts — temporary validation entry (run with
//   node --experimental-strip-types --no-warnings _tools/verifyFormatting.ts)
import { formatPHP, formatPHPExact, formatPHPSmart, formatPHPCompact } from '../Tailoring/src/utils/currency.ts';
import { businessDayRange, formatProductionTime, PRODUCTION_TIME_FALLBACK } from '../Tailoring/src/utils/productionTime.ts';
import { formatPHP as pesoAlias } from '../Tailoring/src/utils/currency.ts';

console.log('--- CURRENCY (required format) ---');
console.log('Starting Price      ', formatPHP(1800));
console.log('Labor Estimate      ', formatPHP(1080));
console.log('Material Estimate   ', formatPHP(540));
console.log('Suggested Deposit   ', formatPHP(900));
console.log('label: Starting Price: ' + formatPHP(1800));
console.log('label: Labor Estimate: ' + formatPHP(1080));
console.log('label: Material Estimate: ' + formatPHP(540));
console.log('label: Suggested Deposit (50%): ' + formatPHP(900));
console.log('--- VARIANTS ---');
console.log('exact    ', formatPHPExact(1800));
console.log('smart    ', formatPHPSmart(1080.5));
console.log('compact  ', formatPHPCompact(1200000), formatPHPCompact(12000), formatPHPCompact(900), formatPHPCompact(0));
console.log('null-safe', formatPHP(null), formatPHP(undefined), formatPHP('n/a'), formatPHP('1800'));
console.log('alias    ', pesoAlias(6500));
console.log('--- PRODUCTION TIME ---');
console.log('businessDayRange(7,10)      ', businessDayRange(7, 10));
console.log('businessDayRange(5,7)       ', businessDayRange(5, 7));
console.log('normalize "7-10 days"       ', formatProductionTime('7-10 days'));
console.log('normalize "5 - 7 days"      ', formatProductionTime('5 - 7 days'));
console.log('normalize null              ', formatProductionTime(null));
console.log('fallback constant           ', PRODUCTION_TIME_FALLBACK);
console.log('--- ENCODING ASSERTIONS ---');
const PESO = '\u20b1';
const ENDASH = '\u2013';
const all = [formatPHP(1800), formatPHP(1080), formatPHP(540), formatPHP(900), pesoAlias(6500)];
console.log('every amount starts with U+20B1 :', all.every((s) => s.startsWith(PESO)));
console.log('every amount starts with real \u20b1:', all.every((s) => s.startsWith('\u20b1')));
console.log('production ranges use en dash  :', businessDayRange(7, 10).includes(ENDASH));
console.log('no literal peso char in source  :', !JSON.stringify([formatPHP(1)]).includes('\u00e2'));