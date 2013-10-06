/*
 * grunt-compress-deploy
 * https://github.com/jswk/grunt-compress-deploy
 *
 * Copyright (c) 2013 Jakub Sawicki
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
      ],
      options: {
        jshintrc: '.jshintrc',
      }
    },

    "compress-deploy" : {
      test_1 : {
        src : "test/dist",
        dest : "/home/frozen/tmp/compress-deploy",
        server_sep : "/",
        auth: {
          host : 'jswk.pl',
          port : 22,
          authKey : 'jswk.pl'
        }
      },
      test_2 : {
        src : "test/dist",
        dest : "/home/frozen/tmp/compress-deploy",
        server_sep : "/",
        clean : true,
        clean_exclusions : ['important', 'dont.touch'],
        auth: {
          host : 'jswk.pl',
          port : 22,
          authKey : 'jswk.pl'
        }
      }
    }

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint']);

};
