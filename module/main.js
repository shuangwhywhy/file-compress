require("babel-register")({
	extensions: [".es6", ".es", ".jsx", ".js"],
	cache: true
});
const system = require('system');
const fs = require('fs-extra');
const fs2 = require('fs.extra');
const Path = require('path');
const Zip = require('node-zip');
const BASE_PATH = require('app-root-path').path;

/**
 * To make zip data of the specified folder and all its contents. It should test the including and excluding
 * rules first to determine if the file should be zipped.
 *
 * @arg `path`: path of the file to be zipped.
 * @arg `root`: the root path of the archive, in other words, the file path in the archive should be
 *      # relative to the `root` path in file system.
 * @arg `includes`: the including rules, defined as an array of regular expressions. If the path matches
 *      # any of the including expression, it can be added to the archive, otherwise, it is skipped.
 * @arg `excludes`: the excluding rules, defined as an array of regular expressions. If the path matches
 *      # any of the excluding expression, it must be skipped even if it matches an including rule.
 * @arg `level`: it limits the maximum path levels in the archive.
 *      # `level` < 0: infinite levels;
 *      # `level` = 0: here is the last, the file cannot be added to the archive;
 *      # `level` > 0: here is not the last, the current path can be added, and for its sub-folders or its
 *      #              containing files, the `level` is reduced by 1 (recursively).
 * @arg `zip`: the Zip container that holds all the files that matches.
 * @return the zip container.
 */
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

/**
 * To evaluate the path definition (may contain regular expressions) and find out the "real" paths
 * which matches the definition.
 *
 * @arg `folders`: the path to evaluate which is represented in an array of folders.
 * @arg `basePath`: it is used for self-recursion. It is the project home path by default and
 *      # it is set to the next folder in each recursive call.
 * @arg `result`: the array to store all the matching paths.
 * @return the array of all the matching paths.
 */
function matchPath (folders, basePath = BASE_PATH, result = []) {
	// turn the "next" folder name into regular expression, should match the bounds and enable multi-line:
	var regex = new RegExp('^' + folders.shift(1) + '$', 'm');

	// only hits directory:
	if (fs.statSync(basePath).isDirectory()) {
		// to get sub-folders of the "next" folder:
		var subfolders = fs.readdirSync(basePath);
		if (folders.length > 0) {
			// if the path has not traversed to the end yet, then recursively test its sub-folders:
			for (let i in subfolders) {
				var matches = regex.exec(subfolders[i]);
				if (matches) {
					basePath = Path.join(basePath, matches[0]);
					matchPath(folders, basePath, result);
				}
			}
		} else {
			// if the path is at the end, then add it to the result array if it matches the regexp:
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
	 * To archive files into Zips which are deflated compressed.
	 *
	 * @arg `config`: the config file path, relative to the project home.
	 *      # config file should be a js object whose keys are the paths of sub-modules of your project,
	 *      # and values are extended from the default values, please @see compress.default.conf.js.
	 * @return undefined
	 */
	archive: function (config) {
		// to load the config file:
		var conf = require(Path.join(BASE_PATH, config));

		for (let path in conf) {
			// to merge the config with the defaults:
			let con = Object.assign(require('../compress.default.conf.js'), conf[path]);

			// to bind some common utilities to the `con` object, which is regarded as the context for path evaluation:
			// current timestamp:
			con.NOW = new Date().getTime();
			// a random number:
			con.RAND = Math.random();

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
				let archive = Path.join(BASE_PATH, con.dest_file.replace(/\{\s*\$(\d+)\s*\}/gm, function () {
					return f.matches[arguments[1]];
				}).replace(/\{:\s*([\w\W]*?)\s*:\}/gm, function () {
					// to replace javascript expressions
					return (new Function('return (' + arguments[1] + ');')).call(con);
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
