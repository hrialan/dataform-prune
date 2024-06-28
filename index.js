
const { BigQuery } = require('@google-cloud/bigquery');
const fs = require('fs');
const path = require('path');

async function extractBqResourcesFromDataformOutput(jsonFilePath) {
  const dataformOutput = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
  const bqResources = {};

  for (const item of [...dataformOutput.tables, ...dataformOutput.assertions]) {
    if (!item.disabled) {
      const { database, schema, name: tableName } = item.target;

      if (!bqResources[database]) {
        bqResources[database] = {};
      }

      if (!bqResources[database][schema]) {
        bqResources[database][schema] = [];
      }

      bqResources[database][schema].push(tableName);
    }
  }

  return JSON.stringify(bqResources, null, 4);
}

async function getBqResourcesFromProjects(projectIds) {
  const bqResources = {};

  for (const projectId of projectIds) {
    const client = new BigQuery({ projectId });
    const [datasets] = await client.getDatasets();

    for (const dataset of datasets) {
      const datasetId = dataset.id;
      const [tables] = await client.dataset(datasetId).getTables();

      if (!bqResources[projectId]) {
        bqResources[projectId] = {};
      }

      if (!bqResources[projectId][datasetId]) {
        bqResources[projectId][datasetId] = [];
      }

      for (const table of tables) {
        bqResources[projectId][datasetId].push(table.id);
      }
    }
  }

  return JSON.stringify(bqResources, null, 4);
}

async function listUnmanagedDataformTables(dataformOutputPath, bqTableRegexToIgnore, bqTableNamesToIgnore) {
  const dataformResources = JSON.parse(await extractBqResourcesFromDataformOutput(dataformOutputPath));
  const projectIds = Object.keys(dataformResources);
  const bqResources = JSON.parse(await getBqResourcesFromProjects(projectIds));
  const unmanagedResources = {};

  for (const projectId of projectIds) {
    for (const datasetId in bqResources[projectId]) {
      for (const tableId of bqResources[projectId][datasetId]) {
        if (!new RegExp(bqTableRegexToIgnore).test(tableId) && !bqTableNamesToIgnore.includes(tableId)) {
          if (!dataformResources[projectId]?.[datasetId]?.includes(tableId)) {
            if (!unmanagedResources[projectId]) {
              unmanagedResources[projectId] = {};
            }

            if (!unmanagedResources[projectId][datasetId]) {
              unmanagedResources[projectId][datasetId] = [];
            }

            unmanagedResources[projectId][datasetId].push(tableId);
          }
        }
      }
    }
  }

  return JSON.stringify(unmanagedResources, null, 4);
}

async function main() {
  try {
    const bqTableNamesToIgnore = process.env.BQ_TABLE_NAMES_TO_IGNORE ? process.env.BQ_TABLE_NAMES_TO_IGNORE.split(',') : [];
    const bqTableRegexToIgnore = process.env.BQ_TABLE_REGEX_TO_IGNORE || '';

    const unmanagedTables = await listUnmanagedDataformTables(
      path.join(__dirname, 'dataform_output.json'),
      bqTableRegexToIgnore,
      bqTableNamesToIgnore
    );

    console.log(unmanagedTables);
  } catch (error) {
    console.error('Failed to compile Dataform or list unmanaged tables:', error);
  }
}

main();
