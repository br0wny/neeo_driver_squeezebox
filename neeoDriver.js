'use strict';

const neeoapi = require('neeo-sdk');
const devices = require('.');

function startDriver(brain) {
	DebugLog('Start server');
	neeoapi.startServer({
		brain,
		port: 6336,
		name: 'neeoDriver',
		devices
	})
	.then(() => {
		DebugLog('Server started');
	})
	.catch((error) => {
		//if there was any error, print message out to console
		DebugLog(`Error: ${error.message}`);
		process.exit(1);
	});
}

const startNeeoDriver = (NALMain) => {
	DebugLog('+++++ Starting NEEO driver');

	const brainIp = process.env.BRAINIP;
	if (brainIp) {
		DebugLog(`Use NEEO Brain IP from env variable ${brainIp}`);
		startDriver(brainIp);
	}else{
		DebugLog('Discover one NEEO Brain...');
		neeoapi.discoverOneBrain().then((brain) => {
			DebugLog(`Brain discovered: ${brain.name}`);
			startDriver(brain);
		});
	}
};

const DebugLog = (output) => {
	console.log("NeeoDriver: " + output);
}

module.exports = {
	startNeeoDriver
};
