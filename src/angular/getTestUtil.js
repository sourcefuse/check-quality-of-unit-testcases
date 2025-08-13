const fs = require('fs');
const output_file = './coverage/ut-results.json';
const input_file_path = './karma-result.json';
if (!fs.existsSync('coverage')) fs.mkdirSync('./coverage');

if (fs.existsSync(input_file_path)) {
  const karma_result_json = require(input_file_path);
  const output = {};
  for (const k in karma_result_json) {
    if (k.toUpperCase() === '__BROWSER_ERRORS__') {
      continue;
    }
    output[k.trim()] = output[k.trim()] || [];
    const keys = Object.keys(karma_result_json[k]);
    for (const v in keys) {
      output[k.trim()].push(keys[v]);
    }
  }
  if (Object.keys(output).length == 0) {
    throw Error('Report not generated.');
  }
  fs.writeFileSync(output_file, JSON.stringify(output, null, 2));
} else {
  throw Error('Report File Not Found.');
}
