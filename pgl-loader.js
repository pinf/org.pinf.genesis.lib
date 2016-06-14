
const Q = require("q");


exports.loadModule = function (uri, config) {

    return Q.fcall(function () {

        var moduleExports = require(uri);

        if (typeof moduleExports.for !== "function") {
            throw new Error("Module at '" + uri + "' does not export 'for()'");
        }

        return moduleExports.for({
            args: {
                config: config
            }
        }).then(function (moduleAPI) {
            return moduleAPI;
        });
    });
}
