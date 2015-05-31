module.exports = function(grunt) {
 // Add the grunt-mocha-test tasks.
  grunt.loadNpmTasks('grunt-mocha-test');

  grunt.initConfig({
    // Configure a mochaTest task
    mochaTest: {
      test: {
        options: {
          require: ['test/init/chai.js','test/init/api_def.js'],
          reporter: 'spec',
          captureFile: false, // Optionally capture the reporter output to a file
          quiet: false, // Optionally suppress output to standard out (defaults to false)
          clearRequireCache: false // Optionally clear the require cache before running tests (defaults to false)
        },
        src: ['test/*.js']
      }
    }
  });

  grunt.registerTask('default', 'mochaTest');

};
