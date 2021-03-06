
const PROGRAM = require("org.pinf.lib/lib/program");
const LOCATOR = require("org.pinf.lib/lib/locator");


require('../lib/api').forModule(require, module, function (API, exports) {
	// Runs multiple times as module is mapped to other modules.

	if (!API.programDescriptor) {
		return {};
	}

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

//	if (
//		API.FS.realpathSync(descriptor._path) === API.FS.realpathSync(API.programDescriptor.getBootPackageDescriptorPath())
//	) {

		var programConfig = API.programDescriptor.parsedConfigForLocator(LOCATOR.fromConfigId(descriptor._data.name + "/0"));

		if (programConfig && programConfig.config) {
			config = API.DEEPMERGE(config, programConfig.config);
		}
//	}

/*
console.log("IMPL", impl);
console.log("api", api);


			var self = this;
			return API.COMPONENT.for(API).unfreezeConfig(self.config).then(function (config) {
				return self.config = config;
			});

*/

//console.log("FINAL CONFIG", config);

	return config;
}, function (API, callback) {
	// Runs ONCE as module is loaded.

	function getProgramDescriptor (callback) {
		if (!process.env.PINF_PROGRAM_PATH) {
			API.console.verbose("Skip loading (not found) program descriptor from 'PINF_PROGRAM_PATH': " + process.env.PINF_PROGRAM_PATH);
			return callback(null, null);
		}
		API.console.verbose("Loading program descriptor1 from 'PINF_PROGRAM_PATH': " + process.env.PINF_PROGRAM_PATH);
		return PROGRAM.fromFile({
			// TODO: Provide necessary API functions.
		}, process.env.PINF_PROGRAM_PATH, callback);
	}

	return getProgramDescriptor(function (err, programDescriptor) {
//console.log("ERROR", programDescriptor._data.config['org.pinf.genesis.lib/0'].api);
		if (err) return callback(err);

		if (!programDescriptor) {
			API.console.warn("Warning: Error loading program descriptor from 'PINF_PROGRAM_PATH': " + process.env.PINF_PROGRAM_PATH);
			return callback(null, {});
		}

		return callback(null, {
			programDescriptor: programDescriptor
		});
	});
});

