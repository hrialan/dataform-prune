# Dataform-Prune: Streamline and Optimize Your Dataform Workflows

## Overview

**Dataform-Prune** is an open-source project designed to efficiently manage and optimize your Dataform configurations through JavaScript scripts and a Docker image that can be integrated into your CI/CD pipelines. Dataform-Prune automates the removal of obsolete or unused objects, ensuring optimal performance and storage usage in your data workflows.

## Features
- **Automated Cleanup:** Easily remove outdated tables, views, and other data artifacts.
- **Storage Optimization:** Maintain a lean and performant data warehouse.
- **Seamless Integration:** Use within your CI/CD pipelines for regular, automated maintenance.

## Usage

### Prerequisites

- Node.js
- Dataform CLI and a Dataform project
- Google Cloud Platform (GCP) account with BigQuery access

### Manual usage

To run the tool manually, you firstly need to create a compilation file of your Dataform project. This can be done by running the following commands in the root of your Dataform project:

```sh
dataform install 
dataform compile --json > dataform-output.json
```

A new json file has now been created in the root of your Dataform project. This file contains all the defined actions and datasets in your Dataform project. You can now clone this repository and run the following command:

```sh
node prune.js --dataformOutputFile /path/to/the/just/created/json/file \
              --bqTableRegexToIgnore /regex/to/ignore/tables/in/your/warehouse \
              --bqTableNamesToIgnore /comma/separated/table/names/to/ignore/in/your/warehouse \
              --deleteUnmanagedBqTables /true/if/you/want/to/delete/unmanaged/tables/in/your/warehouse
```

e.g.

```sh
node prune.js --dataformOutputFile dataform-output.json \
              --bqTableRegexToIgnore "^t_prm_|^t_test" \
              --bqTableNamesToIgnore "table1,table2" \
              --deleteUnmanagedBqTables true
```

In order for the script to run correctly, you need to be bigquery admin in the project where the tables are located.


### CI/CD pipeline and automation

To automate the process of pruning Dataform actions and datasets, you can use this tool in a CI/CD pipeline using Cloud Build. 

A docker image has been created for this tool and can be found in docker hub. You can can direcly use this image in your Cloud Build configuration file.

 Here is an example of a Cloud Build configuration file:

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

  - name: 'hrialan/dataform-prune:latest'
    id: 'Dataform prune'
    args: ["--dataformOutputFile", "dataform-output.json",
           "--bqTableRegexToIgnore", "^t_prm_|^v_am"],
           "--deleteUnmanagedBqTables", "true",
           "--autoApprove", "true"]
```

Be careful with the `--autoApprove` flag. If you set it to `true`, the tool will delete the tables/views without asking for confirmation.

The best practice in production is to firstly set deleteUnmanagedBqTables to false when creating a PR and then set it to true when merging the PR to your default branch. This can easily be done in your CI/CD configuration file.

## Contributing
We welcome contributions! If you'd like to contribute, please fork the repository and use a feature branch. Pull requests are warmly welcome.

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Contact
For any inquiries or support, please open an issue on GitHub or contact me at `dataform-prune@hrialan.simpelogin.com`.
