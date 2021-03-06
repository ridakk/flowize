/* eslint-disable no-restricted-syntax */
const fs = require('fs');
const util = require('util');
const dot = require('dot');
const prettier = require('prettier');

const writeFile = util.promisify(fs.writeFile);

dot.templateSettings.strip = false;

function getFieldType(value) {
  switch (value.type.constructor.name) {
    case 'ENUM':
      return 'enum';

    case 'BOOLEAN':
      return 'boolean';

    case 'STRING':
    case 'DATE':
      return 'string';

    default:
      return 'number';
  }
}

function upperCaseFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function snakeToPascal(str) {
  return str
    .split('_')
    .map((s) => {
      return upperCaseFirstLetter(s);
    })
    .join('');
}

function createFile(path, filename, content) {
  console.log(`creating file: ${filename}`);

  return writeFile(`${path}/${filename}`, content, 'utf8');
}

module.exports = async (
  sequelize = null,
  {
    outputPath = `${__dirname}/flow-typed/`,
    typePrefix = '$',
    excludedModelNames = [],
    excludedModelFields = ['createdAt', 'updatedAt', 'deletedAt'],
    typePerField = true,
  } = {},
) => {
  if (!sequelize || !sequelize.models || sequelize.models.length === 0) {
    return;
  }

  const models = Object.values(sequelize.models).filter((model) => {
    return !excludedModelNames.includes(model.name);
  });

  const dots = dot.process({ path: `${__dirname}/../templates` });
  const files = [];

  for (const model of models) {
    const modelName = upperCaseFirstLetter(model.name);

    const modelData = {
      type: 'model',
      path: 'models',
      name: modelName,
      typePrefix,
      types: [],
      fields: [],
    };

    const fields = Object.entries(model.rawAttributes).filter(([key]) => {
      return !excludedModelFields.includes(key);
    });

    for (const [key, field] of fields) {
      const fieldType = getFieldType(field);
      const fieldName = snakeToPascal(key);

      if (fieldType === 'enum') {
        files.push({
          type: 'enum',
          path: 'enums',
          name: `${modelName}${fieldName}`,
          typePrefix,
          values: field.values,
        });
        modelData.fields.push({
          key,
          value: `${typePrefix}${modelName}${fieldName}`,
        });
      } else if (!field.references) {
        if (typePerField) {
          modelData.types.push({
            key: `${typePrefix}${modelName}${fieldName}`,
            value: fieldType,
          });
        }

        modelData.fields.push({
          key,
          value: typePerField ? `${typePrefix}${modelName}${fieldName}` : fieldType,
          optional: !!field.allowNull,
          default: !!field.defaultValue,
        });
      } else {
        const target = models.find((m) => {
          return m.tableName === field.references.model;
        });
        const targetName = upperCaseFirstLetter(target.options.name.singular);
        const targetPrimaryKeyField = upperCaseFirstLetter(target.primaryKeyField);

        modelData.fields.push({
          key,
          value: `${typePrefix}${targetName}${targetPrimaryKeyField}`,
        });
      }
    }

    const associations = Object.entries(model.associations);

    for (const [, association] of associations) {
      const targetName = upperCaseFirstLetter(association.target.options.name.singular);
      if (association.associationType === 'HasMany') {
        modelData.fields.push({
          key: association.as,
          value: `${typePrefix}${targetName}[]`,
          optional: true,
        });
      } else if (association.associationType === 'BelongsTo') {
        modelData.fields.push({
          key: association.as,
          value: `${typePrefix}${targetName}`,
          optional: true,
        });
      }
    }

    files.push(modelData);
  }

  const prettierOptions = await prettier.resolveConfig();
  for await (const data of files) {
    const main = dots[data.type](data);
    const formatted = prettier.format(main, {
      ...prettierOptions,
      parser: 'babel',
    });

    await createFile(`${outputPath}/${data.path}`, `${data.typePrefix}${data.name}.js`, formatted);
  }
};
