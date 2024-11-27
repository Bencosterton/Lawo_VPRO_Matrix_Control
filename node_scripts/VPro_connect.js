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

runClient();