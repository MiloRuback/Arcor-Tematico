const fs = require('node:fs');
const path = require('node:path');
const validator = require('./tools/node_modules/gltf-validator');
const file = path.resolve(__dirname, '../assets/models/exposicao-shopping.glb');
validator.validateBytes(new Uint8Array(fs.readFileSync(file)), { uri: 'exposicao-shopping.glb', maxIssues: 5000 }).then(report => {
  fs.writeFileSync(path.resolve(__dirname, '../assets/models/validacao-gltf.json'), JSON.stringify(report, null, 2));
  const {messages,...summary}=report.issues;
  console.log(JSON.stringify({validatorVersion: report.validatorVersion, issues: summary, issueCodes:[...new Set(messages.map(m=>m.code))], info:report.info}, null, 2));
  if(report.issues.numErrors)process.exitCode=1;
});
