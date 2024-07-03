
const { BigQuery } = require('@google-cloud/bigquery');
const fs = require('fs');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const readline = require('readline');

// Function to extract BigQuery resources from Dataform output
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

// Function to get BigQuery resources from projects
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

// Function to list unmanaged Dataform tables
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

// Function to delete unmanaged BigQuery tables and empty datasets
async function deleteUnmanagedTables(unmanagedResources, autoApprove) {
  for (const projectId in unmanagedResources) {
    const client = new BigQuery({ projectId });
    for (const datasetId in unmanagedResources[projectId]) {
      for (const tableId of unmanagedResources[projectId][datasetId]) {
        if (!autoApprove) {
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });

          const answer = await new Promise((resolve) => {
            rl.question(`Are you sure you want to delete table ${projectId}.${datasetId}.${tableId}? (yes/no): `, resolve);
          });

          rl.close();

          if (answer.toLowerCase() !== 'yes') {
            console.log(`Skipping deletion of table ${projectId}.${datasetId}.${tableId}`);
            console.log('');  // Add space for clarity
            continue;
          }
        }

        console.log(`Deleting table ${projectId}.${datasetId}.${tableId}...`);
        await client.dataset(datasetId).table(tableId).delete();
        console.log(`Table ${projectId}.${datasetId}.${tableId} deleted.`);
        console.log('');  // Add space for clarity
      }

      // Check if the dataset is empty and delete it if it is
      const [tables] = await client.dataset(datasetId).getTables();
      if (tables.length === 0) {
        console.log(`Dataset ${projectId}.${datasetId} is empty. Deleting dataset...`);
        await client.dataset(datasetId).delete();
        console.log(`Dataset ${projectId}.${datasetId} deleted.`);
        console.log('');  // Add space for clarity
      }
    }
  }
}

// Main function to handle arguments and execute the script
async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('dataformOutputFile', {
      alias: 'd',
      type: 'string',
      description: 'Path to the Dataform output JSON file',
      demandOption: true,
    })
    .option('bqTableNamesToIgnore', {
      alias: 'n',
      type: 'string',
      description: 'Comma-separated list of BigQuery table names to ignore',
      default: '',
    })
    .option('bqTableRegexToIgnore', {
      alias: 'r',
      type: 'string',
      description: 'Regex pattern for BigQuery table names to ignore',
      default: '',
    })
    .option('deleteUnmanagedBqTables', {
      alias: 'u',
      type: 'boolean',
      description: 'Delete unmanaged BigQuery tables',
      default: false,
    })
    .option('autoApprove', {
      alias: 'a',
      type: 'boolean',
      description: 'Automatically approve deletion of unmanaged tables',
      default: false,
    })
    .argv;

  const dataformOutputPath = argv.dataformOutputFile;
  const bqTableNamesToIgnore = argv.bqTableNamesToIgnore ? argv.bqTableNamesToIgnore.split(',') : [];
  const bqTableRegexToIgnore = argv.bqTableRegexToIgnore || null;
  const deleteUnmanagedBqTables = argv.deleteUnmanagedBqTables;
  const autoApprove = argv.autoApprove;

  // Check if the file exists
  if (!fs.existsSync(dataformOutputPath)) {
    console.error(`File not found: ${dataformOutputPath}`);
    process.exit(1);
  }

  try {
    console.log('Starting to list unmanaged Dataform tables...');
    const unmanagedTables = await listUnmanagedDataformTables(
      dataformOutputPath,
      bqTableRegexToIgnore,
      bqTableNamesToIgnore
    );

    if (Object.keys(JSON.parse(unmanagedTables)).length === 0) {
      console.log('');  // Add space for clarity
      console.log('***************************** NO UNMANAGED TABLES *****************************');
      console.log('No unmanaged tables found.');
      return;
    }

    console.log('');  // Add space for clarity
    console.log('***************************** UNMANAGED TABLES *****************************');
    console.log('Unmanaged Tables:', unmanagedTables);

    if (deleteUnmanagedBqTables) {
      console.log('');  // Add space for clarity
      console.log('***************************** DELETION PROCESS *****************************');
      console.log('');  // Add space for clarity
      console.log('Starting to delete unmanaged tables...');
      await deleteUnmanagedTables(JSON.parse(unmanagedTables), autoApprove);
    }
  } catch (error) {
    console.error('Failed to compile Dataform or list unmanaged tables:', error);
  }
}

main();
