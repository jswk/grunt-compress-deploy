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
        dest : "/home/savi/tmp/compress-deploy",
        server_sep : "/",
        auth: {
          host : 'localhost',
          port : 22,
          authKey : 'localhost'
        }
      },
      test_2 : {
        src : "test/dist",
        dest : "/home/savi/tmp/compress-deploy",
        server_sep : "/",
        clean : true,
        exclusions : ['important', 'dont.touch'],
        auth: {
          host : 'localhost',
          port : 22,
          authKey : 'localhost'
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
