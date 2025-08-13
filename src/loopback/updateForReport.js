const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const PACKAGES = ['services', 'facades', 'packages']
const [action] = process.argv.slice(2);
const output_file = './coverage/ut-results.json';
const input_file = '/.mocharc.json';
if (!action) {
    console.error("No action provided. Please specify an action.");
    process.exit(1);
}
console.log("Action:", action);

const allTests = {};
const main = async () => {
    PACKAGES.forEach((pkg) => {
        const PACKAGE_PATH = path.resolve(process.cwd(), pkg)
        fs.readdir(PACKAGE_PATH, (err, items) => {
            if (err) console.log(err);
            else {
                items.forEach((item) => {
                    const itemPath = path.resolve(PACKAGE_PATH, item);
                    if (action.toLowerCase() == "update-mocha") {
                        if (fs.existsSync(itemPath + "/package.json") && fs.existsSync(itemPath + input_file)) {
                            fs.writeFileSync(itemPath + input_file,
                                `{"exit": true,"recursive": true,"require": "source-map-support/register","reporter": "json","reporter-option": ["output=test-results.json"]}`
                            );
                        }
                    } else if (action.toLowerCase() == "collect-report") {
                        const mochaTestPath = path.resolve(itemPath, 'test-results.json');
                        if (fs.existsSync(mochaTestPath)) {
                            const data = JSON.parse(fs.readFileSync(mochaTestPath, 'utf8'));
                            const tests = data["tests"] || [];
                            for (const test of tests) {
                                const testFilePah = test["file"].split("/").pop();
                                allTests[testFilePah] = allTests[testFilePah] || [];
                                allTests[testFilePah].push(test.fullTitle);
                            }
                            fs.unlinkSync(mochaTestPath);
                        }
                    }
                });
                if (!fs.existsSync("./coverage")) {
                    fs.mkdirSync("coverage");
                }
                fs.writeFileSync(output_file, JSON.stringify(
                    allTests, null, 2
                ));
            }
        });
        if (action.toLowerCase() == "collect-report") {
            execSync("git checkout " + pkg);
        }
    });
}
main();