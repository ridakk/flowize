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

For below sequelize models;

```js
class Task extends Model {}
Task.init({ 
  title: Sequelize.STRING,
},
{ sequelize, modelName: 'task' });

class User extends Model {}
User.init({
  username: Sequelize.STRING
},
{ sequelize, modelName: 'user' });

User.hasMany(Task);
Task.belongsTo(User);
```

below FlowJs definitions will be created under `outputPath` option with in `<typePrefix><model name>.js` format.

TypeTitle.js

```js
declare type TypeTaskId = number;
declare type TypeTaskTitle = string;

type Title = {|
  id: TypeTaskId,
  title: TypeTaskTitle,
  userId: TypeUserId,
  user: TypeUser,
|};

declare type TypeTitle = $Shape<Title>;
```

TypeUser.js

```js
declare type TypeUserId = number;

type User = {|
  id: TypeUserId,
  tasks: TypeTitle[],
|};

declare type TypeUser = $Shape<User>;
```
