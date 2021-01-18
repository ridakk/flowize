# flowize

Generate FlowJs Types from Sequelize model definitions

## Usage

```js
const flowize = require('flowize');
const sequelize = require('sequelize');

(async () => {
  // make sure sequelize models are initialized and associated

  await flowize(sequelize, {
    outputPath: `${__dirname}/flow-typed`,
    typePrefix: 'Type',
    excludedModelNames: ['audit'],
    typePerField: true,
  });

  process.exit();
})();
```
