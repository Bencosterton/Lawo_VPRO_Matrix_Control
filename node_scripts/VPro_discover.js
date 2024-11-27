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
        }
    }
    return labels;
}

async function getAllLabels(client, matrix) {
    // Get target labels 
    const targetLabels = await getLabelsForPath(client, '1.10.1.1', matrix._contents.targetCount);

    // Get source labels
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

        // Get lables
        const { targetLabels, sourceLabels } = await getAllLabels(client, matrix);

        // This can take a second
        await new Promise(resolve => setTimeout(resolve, 100));

        // Format the resposne from VPRO
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

runClient();
