const fs = require('fs-extra');
const fs2 = require('fs.extra');
const Path = require('path');
const Zip = require('node-zip');
const BASE_PATH = require('app-root-path').path;

function doZip (path, root = '/', includes = ['.*'], excludes = [], level = -1, zip = new Zip()) {
	if (level == 0) {
		return zip;
	}
	if (level > 0) {
		level --;
	}
	if (fs.statSync(path).isFile()) {
		var relative = Path.relative(root, path);
		var match = false;
		for (let i in includes) {
			let reg = new RegExp(includes[i], 'm');
			if (reg.test(relative)) {
				match = true;
				break;
			}
		}
		for (let i in excludes) {
			let reg = new RegExp(excludes[i], 'm');
			if (reg.test(relative)) {
				match = false;
				break;
			}
		}
		if (match) {
			zip.file(relative, fs.readFileSync(path));
		}
	} else {
		var dir = fs.readdirSync(path);
		dir.forEach(name => doZip(Path.join(path, name), root, includes, excludes, level, zip));
	}
	return zip;
}

function matchPath (folders, basePath = BASE_PATH, result = []) {
	var regex = new RegExp('^' + folders.shift(1) + '$', 'm');

	if (fs.statSync(basePath).isDirectory()) {
		var subfolders = fs.readdirSync(basePath);
		if (folders.length > 0) {
			for (let i in subfolders) {
				var matches = regex.exec(subfolders[i]);
				if (matches) {
					basePath = Path.join(basePath, matches[0]);
					matchPath(folders, basePath, result);
				}
			}
		} else {
			for (let i in subfolders) {
				var matches = regex.exec(subfolders[i]);
				if (matches) {
					result.push({path: Path.join(basePath, matches[0]), matches: matches});
				}
			}
		}
	}
	return result;
}

module.exports = {
	/**
	 * @arg config: the config file path, relative to the project home.
	 * config file should be a js object whose keys are the paths of sub-modules of your project,
	 * and values are extended from the default values, please @see compress.default.conf.js.
	 * @return -
	 *
	 * To archive files into Zips which are deflated compressed.
	 */
	archive: function (config) {
		// to load the config file:
		var conf = require(Path.join(BASE_PATH, config));

		for (let path in conf) {
			// to merge the config with the defaults:
			let con = Object.assign(require('../compress.default.conf.js'), conf[path]);
			// to normalize the path. The paths may be defined in absolute mode, like '/src/pages',
			// which semantically regards the **project home** as the root. In this case, it must be
			// transformed into a relative path.
			// By meanwhile, to normalize the path seperator characters.
			path = Path.join('.', path);
			// to get the "real" absolute path:
			let abs_path = Path.join(BASE_PATH, path);

			// to seperate the path:
			let paths = path.split(Path.sep);
			// to interpret the path array and find the real paths of it (it may contain regular expressions,
			// we need to find out all the folders which match the regexp., and also maintain the matching groups
			// for inner replacement).
			let folders = matchPath(paths);

			for (let i in folders) {
				let f = folders[i];
				// to get the real archive saving path by joining the project home path and replacing the regular expression matches.
				let archive = Path.join(BASE_PATH, con.dest_file.replace(/\{\$(\d)+\}/gm, function () {
					return f.matches[arguments[1]];
				}));

				// to delete the archive container folder before writing to it:
				if (i == 0 && con.empty_folder) {
					fs2.rmrfSync(Path.dirname(archive));
				}

				// to generate the zip object:
				let zip = doZip(f.path, Path.join(f.path, con.archive_root), con.includes, con.excludes);
				let data = zip.generate({base64:false, compression: 'DEFLATE'});

				// to create the empty archive file if not exist as well as the missing directories in the path:
				fs.ensureFileSync(archive);
				// to save the content to the archive file:
				fs.writeFileSync(archive, data, 'binary');
			}
		}
	},
};
