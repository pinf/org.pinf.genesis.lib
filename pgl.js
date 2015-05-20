

module.exports.forModule = function (_require, _module, impl) {
	return require("./lib/api").forModule(_require, _module, impl);
}

