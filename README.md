# Dataform prune automation tool

This tool is used to automate the process of pruning Dataform actions and datasets. It is designed to be used in a CI/CD pipeline to ensure that only the defined Dataform actions and datasets are created in the warehouse.

One drawback of Dataform is that this tool is stateless, meaning that it does not know what actions and datasets are currently in the warehouse. If an SQLx file is deleted from Dataform, the corresponding action and dataset will still exist in the warehouse. This tool is designed to solve this problem by comparing the defined actions and datasets in the Dataform project to the actions and datasets in the warehouse. If a table/view is existing in the warehouse but not defined in the Dataform project, the tool will delete the table/view from the warehouse.


## Usage

### Pre-requisites

- Node.js
- NPM
- Dataform project

### Manual usage

To run the tool manually, you firstly need to create a compilation file of your Dataform project. This can be done by running the following command in the root of your Dataform project:

```sh
dataform install 
dataform compile --json > dataform-output.json
```

A new json file has now been created in the root of your Dataform project. This file contains all the defined actions and datasets in your Dataform project. You can now  clone this repository and run the following command:

```sh
node index.js --dataformOutputFile /path/to/the/just/created/json/file \
              --bqTableRegexToIgnore /regex/to/ignore/tables/in/your/warehouse \
              --bqTableNamesToIgnore /comma/separated/table/names/to/ignore/in/your/warehouse \
              --deleteUnmanagedBqTables /true/if/you/want/to/delete/unmanaged/tables/in/your/warehouse
```

e.g.

```sh
node index.js --dataformOutputFile dataform-output.json \
              --bqTableRegexToIgnore "^t_prm_|^v_am" \
              --bqTableNamesToIgnore "table1,table2" \
              --deleteUnmanagedBqTables true
```

In order for the script to run correctly, you need to be bigquery admin in the project where the tables are located.


### CI/CD pipeline and automation

To automate the process of pruning Dataform actions and datasets, you can use this tool in a CI/CD pipeline using Cloud Build. 

Firstly you need to create a docker image and to store in in artifact registry. You can clone the repository and use the following command:

```sh
gcloud builds submit --tag gcr.io/your-project-id/dataform-prune
```

Then you can add a step in your Cloud Build configuration file to run the tool. Here is an example of a Cloud Build configuration file:

```yaml
steps:
  - name: 'node'
    id: 'Compile Dataform project'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        npm install -g @dataform/cli@^2.9.0
        dataform install
        dataform compile --json > dataform-output.json

  - name: 'gcr.io/your-project-id/dataform-prune'
    id: 'Dataform prune'
    args: ["--dataformOutputFile", "dataform-output.json",
           "--bqTableRegexToIgnore", "^t_prm_|^v_am"],
           "--deleteUnmanagedBqTables", "true",
           "--autoApprove", "true"]
```

Be careful with the `--autoApprove` flag. If you set it to `true`, the tool will delete the tables/views without asking for confirmation.
