
/*

The PINF.Genesis.API pattern provides a mechanism to specify context for
module code as is is being loaded into the runtime (prior to executing
code paths provided by the module implementation).

This is a type of dependency injection which does its work as the
source code is being run for the FIRST time.

A package declares in `package.json` the APIs it wishes to use
and the PINF.Genesis.API system will resolve them and make them available
at runtime:

{
	"config": {
		"org.pinf.genesis.lib/0": {
			"api": {
				"consumes": {
					"FS": "nodejs.org/api/fs"
				}
			}
		}
	}
}

The pattern all modules within the package should follow:

````
require("org.pinf.genesis.lib/lib/api").forModule(module, function (API, exports) {
	exports.foo = function () {
		// API.FS.<method>
	}
});
````

*/


const Q = require("q");
const PATH = require("path");
const FS = require("fs-extra");
const WAITFOR = require("waitfor");
const PACKAGE = require("org.pinf.lib/lib/package");
const PROGRAM = require("org.pinf.lib/lib/program");
const LOCATOR = require("org.pinf.lib/lib/locator");
const DEEPMERGE = require("deepmerge");
const EXTEND = require("extend");
const JP = require("JSONPath");
const RESOLVE = require("resolve");


function loadMetaForPackage (packageRoot, callback) {
	const descriptors = {};
	if (descriptors[packageRoot]) {
		return callback(null, descriptors[packageRoot][0], descriptors[packageRoot][1]);
	}

	return PACKAGE.fromFile(PATH.join(packageRoot, "package.json"), function (err, descriptor) {
		if (err) return callback(err);

		function getProgramDescriptor (callback) {
			if (!process.env.PINF_PROGRAM_PATH) {
				return callback(null, null);
			}
			return PROGRAM.fromFile({
				// TODO: Provide necessary API functions.
			}, process.env.PINF_PROGRAM_PATH, callback);
		}

		return getProgramDescriptor(function (err, programDescriptor) {
	//console.log("ERROR", programDescriptor._data.config['org.pinf.genesis.lib/0'].api);
			if (err) return callback(err);

			if (programDescriptor) {
				var programConfig = programDescriptor.parsedConfigForLocator(LOCATOR.fromConfigId(descriptor._data.name + "/0"));
				if (
					programConfig &&
					programConfig.config.config
				) {
					descriptor._data.config = DEEPMERGE(descriptor._data.config, programConfig.config.config);
				}
			}
/*
			if (
				programDescriptor &&
				programDescriptor._data.config
			) {
				for (var name in programDescriptor._data.config) {
					if (typeof descriptor._data.config[name] !== "undefined") {
						descriptor._data.config[name] = DEEPMERGE(descriptor._data.config[name], programDescriptor._data.config[name]);
					}
				}
			}
*/

			descriptors[packageRoot] = [
				descriptor,
				descriptor.configForLocator(LOCATOR.fromConfigId("org.pinf.genesis.lib/0"))
			];

			return callback(
				null,
				descriptors[packageRoot][0],
				descriptors[packageRoot][1]
			);
		});
	});
}

exports.forModule = function (require, module, impl, initImpl, triggerFor) {

	function formatLogArgs (args) {
		var allStrings = true;
		args.forEach(function (arg) {
			if (!allStrings) return;
			if (typeof arg !== "string") {
				allStrings = false;
			}
		});
		if (allStrings) {
			return args.join(" ");
		}
		return (args.length > 1 ? args : args[0]);
	}

	var API = Object.create({
		__pgl_meta: {
			API: {}
		},
		VERBOSE: !!process.env.VERBOSE,
		DEBUG: !!process.env.DEBUG,
		SINGLETONS: {},
		EXTEND: EXTEND,
		PATH: PATH,
		FS: FS,
		Q: Q,
		JP: JP
	});

	function injectConsole (api) {
		api.console = {
			log: function () {
				var args = Array.prototype.slice.call(arguments);
				console.log.call(console, "log", formatLogArgs(args));
			},
			error: function () {
				var args = Array.prototype.slice.call(arguments);
				console.log.call(console, "error", formatLogArgs(args));
			},
			warn: function () {
				if (!api.VERBOSE) return;
				var args = Array.prototype.slice.call(arguments);
				console.log.call(console, "info", formatLogArgs(args));
			},
			verbose: function () {
				if (!api.VERBOSE) return;
				var args = Array.prototype.slice.call(arguments);
				console.log.call(console, "info", formatLogArgs(args));
			},
			debug: function () {
				if (!api.DEBUG) return;
				var args = Array.prototype.slice.call(arguments);
				console.log.call(console, "debug", formatLogArgs(args));
			}
		};
		api.insight = {
			log: function () {
				var args = Array.prototype.slice.call(arguments);
				console.log.call(console, "log", formatLogArgs(args));
			},
			error: function () {
				var args = Array.prototype.slice.call(arguments);
				console.log.call(console, "error", formatLogArgs(args));
			},
			warn: function () {
				if (!api.VERBOSE) return;
				var args = Array.prototype.slice.call(arguments);
				console.log.call(console, "info", formatLogArgs(args));
			},
			verbose: function () {
				if (!api.VERBOSE) return;
				var args = Array.prototype.slice.call(arguments);
				console.log.call(console, "info", formatLogArgs(args));
			},
			debug: function () {
				if (!api.DEBUG) return;
				var args = Array.prototype.slice.call(arguments);
				console.log.call(console, "debug", formatLogArgs(args));
			}
		};
	}

	injectConsole(API);

	var deferred = Q.defer();

	var callback = function (err) {
		if (err) {
			console.log(err.stack);
			deferred.reject(err);
			return;
		}
		deferred.resolve();
		if (require.main === module) {
			Q.when(deferred.promise).then(function () {
				module.exports.for(API);
			}).fail(function (err) {
				console.error("Error calling main module '" + module.filename + "':", err.stack);
			});
		}
		return;
	}

	function getPackageRoot (callback) {
		function find (path, callback) {
			return FS.exists(PATH.join(path, "package.json"), function (exists) {
				if (exists) {
					return callback(null, path);
				}
				var newPath = PATH.dirname(path);
				if (newPath === path) {
					return callback(new Error("No package.json descriptor found for module '" + module.filename + "'!"));
				}
				return find(newPath, callback);
			});
		}
		return find(PATH.dirname(module.filename), callback);
	}

	function forToExport (CALLING_API) {

		CALLING_API = CALLING_API || {};

		function init () {
			return Q.fcall(function () {
				try {
					var exports = {};
					var api = Object.create(API);
					api.VERBOSE = CALLING_API.VERBOSE || API.VERBOSE;
					api.DEBUG = CALLING_API.DEBUG || API.DEBUG;
					api.args = (CALLING_API && CALLING_API.args) || {};

					injectConsole(api);

					// Now we merge calling args on top.
					for (var name in api.args) {
						api[name] = api.args[name];
					}
					var ret = impl(api, exports);
					if (typeof ret !== "undefined") {
						exports = ret;
					}

					if (
						typeof exports.PLComponent === "function" &&
						CALLING_API._NO_INIT_PLComponent !== true
					) {
						exports = exports.PLComponent(api.config, {});
					}

					return exports;
				} catch (err) {
					err.message += " (while loading implementation code for module '" + module.filename + "')";
					err.stack += "\n(while loading implementation code for module '" + module.filename + "')";
					throw err;
				}
			}).then(function (exports) {
				return exports;
			}).fail(function (err) {
				console.error(err.stack);
				throw err;
			});
		}
		if (Q.isPending(deferred.promise)) {
			return Q.when(deferred.promise).then(function () {
				return init();
			});
		}
		return init();
	}

	if (!triggerFor) {
		module.exports.for = forToExport;
	}

	getPackageRoot(function (err, packageRoot) {
		if (err) return callback(err);

		return loadMetaForPackage(packageRoot, function (err, descriptor, config) {
			if (err) return callback(err);

			function mapDeclaredAPIs (callback) {
				if (
					!config ||
					!config.api ||
					!config.api.consumes
				) {
					return callback(null);
				}
				var waitfor = WAITFOR.serial(function (err) {
					if (err) return callback(err);
					return callback(null);
				});
				if (API.DEBUG) {
					console.log("config.api.consumes:", config.api.consumes);
				}
				for (var name in config.api.consumes) {
					waitfor(name, function (name, callback) {
						// TODO: Support more types of mappings.
						var m = config.api.consumes[name].match(/^([^\/]+)\/(\d+)\/([^\/]+)$/);
						if (m) {

							var apiPackageRoot = null;
							try {
								apiPackageRoot = PATH.dirname(RESOLVE.sync(m[1] + "/package.json", {
									basedir: packageRoot
								}));
							} catch (err) {

								// Fall back to loading module from workspace.
								// This is needed if a new mapping is overlayed by the program descriptor.
								if (process.env.PGS_WORKSPACE_ROOT) {
									apiPackageRoot = PATH.dirname(RESOLVE.sync(m[1] + "/package.json", {
										basedir: process.env.PGS_WORKSPACE_ROOT
									}));
								}
							}

							return loadMetaForPackage(apiPackageRoot, function (err, apiDescriptor, apiConfig) {
								if (err) return callback(err);
								if (
									!apiConfig ||
									!apiConfig.api ||
									!apiConfig.api.provides ||
									!apiConfig.api.provides[m[3]]
								) {
									return callback(new Error("Package '" + apiPackageRoot + "' does not declare API '" + m[3] + "' used by '" + packageRoot + "' by mapping '" + (apiConfig.api && apiConfig.api.consumes && apiConfig.api.consumes[name]) + "' to '" + name + "'"));
								}
								var uri = apiConfig.api.provides[m[3]];
								if (/^\./.test(uri)) {
									uri = PATH.join(apiPackageRoot, uri);
								}

								uri = FS.realpathSync(uri);

								try {
									API.__pgl_meta.API[name] = {
										uid: config.api.consumes[name],
										filepath: uri
									};
									if (API.DEBUG) {
										console.log("Load module from uri: " + uri);
									}
									var obj = require(uri);
									if (!(
										(typeof obj === "function") ||
										(
											typeof obj === "object" &&
											Object.keys(obj).length > 0
										)
									)) {
										return callback(new Error("Module at '" + uri + "' does not export anything"));
									}
									if (typeof obj.for !== "function") {
										return callback(new Error("Module at '" + uri + "' does not export 'for()'"));
									}
									var api = Object.create(API);
									api.args = {};
									api.args[config.api.consumes[name]] = {
										descriptor: descriptor
									};
									return Q.when(obj.for(api)).then(function (api) {
										API[name] = api;
										return callback(null);
									}, callback);
								} catch (err) {
									return callback(err);
								}
							});
						} else {
//						if (!/\//.test(config.api.consumes[name])) {

							var location = config.api.consumes[name];
							if (/^\./.test(location)) {
								location = PATH.join(packageRoot, location);
							}
							try {
								API.__pgl_meta.API[name] = {
									uid: location,
									filepath: require.resolve(location)
								};
							} catch (err) {
								console.error(err.stack);
								return callback(new Error("Error loading module '" + location + "' for packageRoot '" + packageRoot + "'. Not found."));
							}
							if (API.DEBUG) {
								console.log("Load module from uri: " + location);
							}
							API[name] = require(location);
							if (!(
								(typeof API[name] === "function") ||
								(
									typeof API[name] === "object" &&
									Object.keys(API[name]).length > 0
								)
							)) {
								console.error("API[name]", name, API[name]);
								return callback(new Error("Module at '" + location + "' does not export anything"));
							}
							return callback(null);
//						} else {
//							return callback(new Error("Could not resolve declared API '" + config.api.consumes[name] + "' for '" + name + "'"));
						}
					});
				}
				return waitfor();
			}

			function finalize (callback) {
				if (!triggerFor) {
					return callback(null);
				}

				deferred.resolve();
				return Q.when(forToExport(null)).then(function () {
					return callback(null);
				}, callback);
			}

			return mapDeclaredAPIs(function (err) {
				if (err) return callback(err);

				if (initImpl) {
					try {
						return initImpl(Object.create(API), function (err, api) {
							if (err) return callback(err);
							if (api) {
								for (name in api) {
									API[name] = api[name];
								}
							}
							return finalize(callback);
						});
					} catch (err) {
						return callback(err);
					}
				}

				return finalize(callback);
			});
		});
	});

	return deferred.promise;
}

