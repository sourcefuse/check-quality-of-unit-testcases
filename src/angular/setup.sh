rm -rf node_modules karma-result.json ./coverage/ut-results.json
npm install
npm run test
node getTestUtil.js