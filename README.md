# File Archiver

This is a nodejs utility package. It archives project files into one or more zip files. It has very simple APIs and is highly configurable in an easy way.

- Name: **file-compress**
- Current Version: **v1.0.9**
- Author: **Yizhou Qiang**
- Email: **qyz.yswy@hotmail.com**

---

## Getting started

- ### Step 1:

	Run `npm install file-compress --save` in your project home, or add the package name `file-compress` to your `package.json` file.

---

- ### Step 2:

	Create a config file **"compress.conf.js"** (can be anything) in your project home folder (or anywhere else).



---

- ### Step 3:

	Setup the paths in your config file that you want to archive separately. The config file should look like this:

		const Path = require('path');
		module.exports = {
			'/static/pages/.*':	{	dest_file: '/assets/{: this.NOW :}/{$0}.zip',
									excludes: ['.test.js'],
									archive_root: '.',
									filenameMapper: function (path) {
										return Path.resolve(Path.dirname(path), this.MD5(path) + Path.extname(path));
									}},
			'/static/common':	{	dest_file: '/assets/common.zip',
									includes: ['.jpg', '.png', '.js'],
									excludes: ['test.*'],
									archive_root: '..'}
		};

	- *As you can see, it is just a module object. The keys are the paths that are **relative to your project home** that you wish to archive as zip files separately. You can use ***regular expressions*** in the path names to reduce the number of entries in your config file to keep concise.*

	- *Please be cautious to write conflict path names such as `/static/.*` and `/static/foo`. **It is a valid usage** - the same directory can be archived into two or more zip files according to different config blocks.*

---

- ### Step 4:

	Setup some detailed values for each path config. Currently, all the available config entries are:

	- `dest_file`: ***string*** | the archive file path to save with. | **Default**: `'/assets.zip'`
	- `includes`: ***array*** | to filter in a set of filename (with pathnames) rules described in *regular expressions*. **Default**: `['.*'] // all files`
	- `excludes`: ***array*** | to filter out the filenames (with pathnames) that matches the *regular expression* rules. **Default**: `[]`
	- `archive_root`: ***string*** | cwd of the in-archive root path. **Default**: `'.'`
	- `empty_folder`: ***boolean*** | should empty the archive containing folder first? **Default**: `false`
	- `filenameMapper`: ***function*** | to transfer the real file path to its corresponding archived path. **Default**: `(path) => path`

---

- ### Step 5:

	Congratulations! You are almost there. Create a test file in your project home, say `test-compress.js` and write the following code:

		require('file-compress').archive('/compress.conf.js');

	Again, the argument of `archive` function here is the configuration file path **relative to your project home**.

---

- ### Step6:

	Run `test-compress.js` and enjoy!

---

## Hints

- to map the filename, you can take advantage of path module. For instance, to flare out the pathnames, you can do the following:

		filenameMapper: function (path) {
			return require('path').basename(path);
		}

- You can use regular expression grouping replacements in the path names. The syntax is `{$matching_index}`, e.g. `{$0}`, `{$1}`, etc.
- You can write JS-expressions between `{:` `:}`. The script context is the current config block. Please refer to the list below to see some embedded variables and functions:
	- `this.NOW`: current timestamp in milliseconds. It is set to the start time of running the script.
	- `this.RAND`: a random decimal number, between 0 (including) to 1 (excluding).
	- `this.MD5(msg)`: to generate md5 hash of given msg.
	- TBD.
