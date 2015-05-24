
const PROGRAM = require("org.pinf.lib/lib/program");
const LOCATOR = require("org.pinf.lib/lib/locator");


require('../lib/api').forModule(require, module, function (API, exports) {
	// Runs multiple times as module is mapped to other modules.

	API.ASSERT(typeof API.args['org.pinf.genesis.lib/0/config'].descriptor, "object");

	var descriptor = API.args['org.pinf.genesis.lib/0/config'].descriptor;

	var config = {};
	if (
		descriptor._data.name &&
		descriptor._data.config &&
		descriptor._data.config[descriptor._data.name + "/0"]
	) {
		config = descriptor._data.config[descriptor._data.name + "/0"];
	}

	if (
		descriptor._path === API.programDescriptor.getBootPackageDescriptorPath()		
	) {
		var programConfig = API.programDescriptor.parsedConfigForLocator(LOCATOR.fromConfigId(descriptor._data.name + "/0"));
		if (programConfig && programConfig.config) {
			config = API.DEEPMERGE(config, programConfig.config);
		}
	}

	return config;
}, function (API, callback) {
	// Runs ONCE as module is loaded.

	function getProgramDescriptor (callback) {
		if (!process.env.PINF_PROGRAM_PATH) {
			API.console.verbose("Skip loading (not found) program descriptor from 'PINF_PROGRAM_PATH':", process.env.PINF_PROGRAM_PATH);
			return callback(null, null);
		}
		API.console.verbose("Loading program descriptor from 'PINF_PROGRAM_PATH':", process.env.PINF_PROGRAM_PATH);
		return PROGRAM.fromFile({
			// TODO: Provide necessary API functions.
		}, process.env.PINF_PROGRAM_PATH, callback);
	}

	return getProgramDescriptor(function (err, programDescriptor) {
		if (err) return callback(err);

		if (!programDescriptor) {
			return callback(new Error("Error loading program descriptor from 'PINF_PROGRAM_PATH':", process.env.PINF_PROGRAM_PATH));
		}

		return callback(null, {
			programDescriptor: programDescriptor
		});
	});
});

