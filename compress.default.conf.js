/* -- DO NOT change or move this file -- */
/* The default configurations */
module.exports = {

	/* Default archive file name, saving to project home */
	dest_file: '/assets.zip',

	/* include all files by default, regular expressions are allowed */
	includes: ['.*'],

	/* excluding patterns, regular expressions are allowed, nothing by default */
	excludes: [],

	/* root directory of zip, relative to the specifying folder */
	archive_root: '.',

	/* should the zip container folder be emptied at first time? */
	empty_folder: false,

};
