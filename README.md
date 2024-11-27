# node-emberplus / Lawo VPro Matrix control

This is a small project to act as a rouing interface for multiple Lawo VPro devices. 

bellow node.js scripts are used to get video matrix and perform routing tasks.


![image](https://github.com/user-attachments/assets/e9e1bdb8-bc8e-4cf9-a801-282294a616b9)

### Example usage of node.js scripts

Commandline argument for getting video matrix output as json

```bash
node VPro_discover.js -h <VPRO-IP> -p 9000
```

VPro Discovery (VPro_discovery.js)

```javascript
const { EmberClient, EmberClientEvent } = require('node-emberplus');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const argv = yargs(hideBin(process.argv))
    .option('host', {
        alias: 'h',
        type: 'string',
        demandOption: true,
        description: 'Lawo VPRO host IP address',
    })
    .option('port', {
        alias: 'p',
        type: 'number',
        demandOption: true,
        description: 'Lawo VPRO port',
    })
    .help()
    .argv;

async function getLabelsForPath(client, basePath, count) {
    const labels = {};
    for (let i = 0; i < count; i++) {
        try {
            const labelNode = await client.getElementByPathAsync(`${basePath}.${i}`);
            if (labelNode && labelNode._contents && labelNode._contents.identifier) {
                labels[i] = labelNode._contents.identifier;
            }
        } catch (e) {
            // Skip if label not found
        }
    }
    return labels;
}

async function getAllLabels(client, matrix) {
    // Get target labels (using targetCount from matrix)
    const targetLabels = await getLabelsForPath(client, '1.10.1.1', matrix._contents.targetCount);

    // Get source labels (using sourceCount from matrix)
    const sourceLabels = await getLabelsForPath(client, '1.10.1.2', matrix._contents.sourceCount);

    return { targetLabels, sourceLabels };
}

async function runClient() {
    const { host, port } = argv;
    const client = new EmberClient({ host, port });

    try {
        await client.connectAsync();

        // Get the matrix node
        let matrix = await client.getElementByPathAsync("pro8/Video-Matrix/Matrix");

        // Get all labels
        const { targetLabels, sourceLabels } = await getAllLabels(client, matrix);

        // Wait for connections to be populated
        await new Promise(resolve => setTimeout(resolve, 100));

        // Format and output connections with labels
        if (matrix.connections) {
            const formattedConnections = {};
            for (const [target, connection] of Object.entries(matrix.connections)) {
                formattedConnections[target] = {
                    target: {
                        index: connection.target,
                        label: targetLabels[connection.target] || `Target ${connection.target}`
                    },
                    sources: connection.sources.map(sourceIndex => ({
                        index: sourceIndex,
                        label: sourceLabels[sourceIndex] || `Source ${sourceIndex}`
                    }))
                };
            }
            console.log(JSON.stringify(formattedConnections, null, 2));
        }

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await client.disconnectAsync();
        process.exit(0);
    }
}
```


```bash
node VPro_connect.js -h <VPRO-IP> -p 9000 -s <source-number> -t <destination-number>
```

VPro matric connections (VPro_connect.js)

```javascript
const { EmberClient, EmberClientEvent, LoggingService } = require('node-emberplus');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
    .option('host', {
        alias: 'h',
        type: 'string',
        demandOption: true,
        description: 'Lawo VPRO host IP address',
    })
    .option('port', {
        alias: 'p',
        type: 'number',
        demandOption: true,
        description: 'Lawo VPRO port',
    })
    .option('source', {
        alias: 's',
        type: 'number',
        demandOption: true,
        description: 'Source to connect',
    })
    .option('target', {
        alias: 't',
        type: 'number',
        demandOption: true,
        description: 'Target to connect',
    })
    .help()
    .argv;

async function runClient() {
    const { host, port, source, target } = argv;
    const client = new EmberClient({ host, port, logger: new LoggingService(5) });

    client.on(EmberClientEvent.ERROR, e => {
        console.error('Error:', e);
    });

    try {
        await client.connectAsync();
        console.log(`Connected to Lawo VPRO at ${host}:${port}`);

        await client.getDirectoryAsync();
        let matrix = await client.getElementByPathAsync("pro8/Video-Matrix/Matrix");

        console.log(`Connecting source ${source} to target ${target}`);
        await client.matrixConnectAsync(matrix, target, [source]);

    } catch (e) {
        console.error('Error:', e.stack);
    } finally {
        await client.disconnectAsync(); // Close the connection
        console.log('Disconnected from VPRO 3');
    }
}
```
