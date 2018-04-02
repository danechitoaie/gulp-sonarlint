const path = require('path');
const fs = require('fs');
const sonarjs = require('sonarjs');
const through2 = require('through2');
const fancyLog = require('fancy-log');
const PluginError = require('plugin-error');

module.exports = (projectPath, projectExcludes) => {
    const projectFilePath = path.relative(process.cwd(), projectPath);

    return through2.obj(function(file, encoding, callback) {
        if (!fs.existsSync(projectFilePath)) {
            this.emit('error', new PluginError('gulp-sonarlint', projectFilePath + ' does not exist!'));
            return;
        }

        if (!fs.statSync(projectFilePath).isDirectory()) {
            this.emit('error', new PluginError('gulp-sonarlint', projectFilePath + ' is not a directory!'));
            return;
        }

        sonarjs.analyze(projectPath, {
            log: (message, logLevel) => {
                switch (logLevel) {
                    case 'INFO':
                        fancyLog.info(message);
                    break;

                    case 'WARN':
                        fancyLog.warn(message);
                    break;

                    case 'ERROR':
                        fancyLog.error(message);
                    break;
                }
            },
            onStart: () => {
                fancyLog('Analyzing ' + projectPath + '...');
            },
            onEnd: () => {

            },
            exclusions: projectExcludes
        }).then(
            (val) => {
                if (val.length > 0) {
                    val.forEach((v) => {
                        const vSeverity = v.severity;
                        const vKey = v.key.split(':')[1];
                        const vFile = v.file;
                        const vLine = v.pos.line;
                        const vColumn = v.pos.column + 1;
                        const vMessage = v.message;

                        fancyLog(vSeverity + ' - ' + vKey + ': ' + vFile + ' [' + vLine + ', ' + vColumn + ']: ' + vMessage);
                    });
                    this.emit('error', new PluginError('gulp-sonarlint', 'Found ' + val.length + ' issues!'));
                } else {
                    fancyLog('No issues found!');
                    callback(null, file);
                }
            },
            (err) => {
                this.emit('error', new PluginError('gulp-sonarlint', err));
            }
        ).catch((err) => {

        });
    });
};