# Dataform Prune

An open-source tool for automating the cleanup of outdated objects in Dataform configurations, optimizing data workflows with seamless CI/CD integration.

## Overview

**dataform-prune** is an open-source solution that optimizes Dataform configurations by removing obsolete or unused warehouse objects. Seamlessly integrate it into your CI/CD pipelines using JavaScript scripts and a Docker image for improved performance and storage efficiency.

## Features

- **Automated Cleanup:** Easily remove outdated tables, views, and datasets.
- **Storage Optimization:** Maintain a lean and performant data warehouse.
- **Seamless Integration:** Use within your CI/CD pipelines for regular, automated maintenance.

## Usage

### Prerequisites

- Node.js
- Dataform CLI and a Dataform project
- Google Cloud Platform (GCP) account with BigQuery access

### Manual Usage

First, create a compilation file of your Dataform project by running the following commands in the root of your Dataform project:

```sh
dataform install
dataform compile --json > dataform-output.json
```

A new JSON file (`dataform-output.json`) will be created in the root of your Dataform project, containing all defined actions and datasets. You can now clone the Dataform-Prune repository and run the following command:

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

Ensure you have BigQuery admin permissions in the project where the tables are located for the script to run correctly.


### CI/CD Pipeline and Automation

To automate the pruning process, you can use this tool in a CI/CD pipeline with Google Cloud Build.

A Docker image for this tool is available on Docker Hub. You can directly use this image in your Cloud Build configuration file.

Example Cloud Build configuration file:

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

⚠️ Caution: With the `--autoApprove` flag set to true, the tool will delete the tables/views without asking for confirmation.

To follow best practices in production, initially set `deleteUnmanagedBqTables` to false when creating a PR, and set it to true when merging the PR to your default branch. This can easily be configured in your CI/CD file.

## Contributing
We welcome contributions! If you'd like to contribute, please fork the repository and use a feature branch. Pull requests are warmly welcome.

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Contact
For any inquiries or support, please open an issue on GitHub or contact me at `dataform-prune@hrialan.simpelogin.com`.
