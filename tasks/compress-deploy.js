/*
 * grunt-compress-deploy
 * https://github.com/jswk/grunt-compress-deploy
 *
 * Copyright (c) 2013 Jakub Sawicki
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  var extend = require('extend'),
      Targz  = require('tar.gz'),
      path   = require('path'),
      fs     = require('fs'),
      ssh    = require('ssh2'),
      step   = require('step');



  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('compress-deploy', 'Makes it easy and fast to deploy your project', function() {
    // Merge task-specific and/or target-specific options with these defaults.
    var options = extend({
      src : null,
      dest : null,
      clean : false,
      clean_exclusions : [],
      server_sep : path.sep,
      archive_name : 'tmp.tar.gz',
      auth: null
    }, this.data);

    step(
      function () {
        this(options);
      },
      compressSrc,
      createConnection,
      cleanDest,
      deployArchive,
      extractArchive,
      cleanArchive,
      closeConnection,
      this.async()
    );
  });

  function compressSrc(options) {
    var self = this;

    grunt.log.write('Compressing ' + options.src + ' to ' + options.archive_name);

    new Targz().compress(path.resolve(options.src), path.resolve(options.archive_name), function (err) {
      if (err) {
        grunt.warn(err);
      }

      grunt.log.write(' done'.green + '\n');

      self(options);
    });
  }

  function createConnection(options) {
    var ssh  = getConnection(options),
        self = this;

    ssh.on('connect', function () {
      //console.log('Connection :: connect');
    });

    ssh.on('error', function (err) {
      //console.log('Connection :: error ::', err);
    });

    ssh.on('end', function () {
      //console.log('Connection :: end');
    });

    ssh.on('close', function (had_error) {
      //console.log('Connection :: close', had_error);
    });

    ssh.on('ready', function () {
      console.log('Connection :: ready');

      self(options, ssh);
    });
  }

  function getRootPath(options) {
    var remoteRoot = options.dest,
        remoteSep  = options.server_sep;

    // correct separators in case they are wrong
    remoteRoot = remoteRoot.replace(path.sep, remoteSep, 'g');

    return remoteRoot;
  }

  function cleanDest(options, ssh) {
    var self             = this,
        clean            = options.clean,
        clean_exclusions = options.clean_exclusions,
        remoteSep        = options.server_sep;

    if (!clean) {
      this(options, ssh);
    } else {
      // filter out dir and parent dir positions as well
      clean_exclusions = clean_exclusions.concat(['.','..','.'+remoteSep,'..'+remoteSep]);
      // as basic regex support in grep leaves only the function of '.' unchanged
      // plain dots must be preceded by backslash
      clean_exclusions = clean_exclusions.map(function (name) { return name.replace('.', '\\.', 'g')});
      // list all files in directory
      // filter out excluded ones
      // execute rm -rf for every entry left
      var command = 'cd '+getRootPath(options)+' && ls -a | grep -v "^\\('+clean_exclusions.join('\\|')+'\\)$" | xargs rm -rf';

      grunt.log.write('Cleaning dest directory');

      ssh.exec(command, function (err, stream) {
        if (err) {
          grunt.warn(err);
        }

        grunt.log.write(' done'.green + '\n');
        self(options, ssh);
      });
    }
  }

  function deployArchive(options, ssh) {
    var src = path.resolve(options.archive_name),
        remoteSep = options.server_sep,
        dest = options.dest + remoteSep + options.archive_name,
        self = this;

    // correct separators in case they are wrong
    dest = dest.replace(path.sep, remoteSep, 'g');

    ssh.sftp(function (err, sftp) {
      if (err) {
        grunt.warn('SFTP :: ' + err);
      }

      sftp.on('end', function () {
        //console.log('SFTP :: end');
      });

      sftp.on('close', function () {
        //console.log('SFTP :: close');

        self(options, ssh);
      });

      sftp.on('error', function (err) {
        grunt.warn('SFTP :: ' + err);
      });

      sftp.on('open', function (err) {
        //console.log('SFTP :: open');
      });

      grunt.log.write('Transferring ' + src + ' to ' + dest);

      sftp.fastPut(src, dest, function (err) {
        if (err) {
          grunt.warn('SFTP :: PUT :: ' + err);
        }

        grunt.log.write(' done'.green + '\n');

        sftp.end();
      })
    });
  }

  function extractArchive(options, ssh) {
    var self = this;

    grunt.log.write('Decompressing the archive');

    var command = 'cd '+getRootPath(options)+' && '+
                  'tar -xzf ' + options.archive_name + ' --strip-components 1 && '+
                  'find -type d -print0 | xargs -0 chmod 755 && '+
                  'find -type f -print0 | xargs -0 chmod 644';

    ssh.exec(command, function (err, stream) {
      if (err) {
        grunt.warn(err);
      }

      grunt.log.write(' done'.green + '\n');
      self(options, ssh);
    });
  }

  function cleanArchive(options, ssh) {
    var self = this;

    grunt.log.write('Removing archive from local and server');

    ssh.exec('cd '+getRootPath(options)+' && rm ' + options.archive_name, function (err) {
      if (err) {
        grunt.warn(err);
      }

      fs.unlink(path.resolve(options.archive_name), function (err) {
        if (err) {
          grunt.warn(err);
        }

        grunt.log.write(' done'.green + '\n');
        self(options, ssh);
      })
    });
  }

  function closeConnection(options, ssh) {
    var self = this;

    ssh.on('close', function (had_error) {
      //console.log('Connection :: close', had_error);

      self();
    });

    ssh.end();
  }

  function getAuthByKey(inKey) {
    var tmpStr;
    var retVal = null;

    if (fs.existsSync('.ftppass')) {
      tmpStr = grunt.file.read('.ftppass');
      if (inKey !== null && tmpStr.length) retVal = JSON.parse(tmpStr)[inKey];
    }

    return retVal;
  }

  function getKeyLocation(customKey) {
    var keyLocation = null;
    var defaultKeys = [
      process.env.HOME + '/.ssh/id_dsa',
      process.env.HOME + '/.ssh/id_rsa'
    ];

    if (customKey) {
      if (fs.existsSync(customKey)) keyLocation = customKey;
    } else {
      for (i = 0; i < defaultKeys.length; i++) {
        if (fs.existsSync(defaultKeys[i])) keyLocation = defaultKeys[i];
      }
    }

    if (keyLocation === null) grunt.warn('Could not find private key.');
    return keyLocation;
  }

  function getConnection(options) {

    var sshConn = new ssh();

    var authVals = getAuthByKey(options.auth.authKey);

    var connection = {
      host: options.auth.host,
      port: options.auth.port
    };


    // Use either password or key-based login
    if (authVals === null) {
      grunt.warn('.ftppass seems to be missing or incomplete');
    } else {

      connection.username = authVals.username;

      if (authVals.password === undefined) {
        keyLocation = getKeyLocation(authVals.keyLocation);
        connection.privateKey = fs.readFileSync(keyLocation);
        if (authVals.passphrase) connection.passphrase = authVals.passphrase;
        grunt.log.ok('Logging in with key at ' + keyLocation);
      } else {
        connection.password = authVals.password;
        grunt.log.ok('Logging in with username ' + authVals.username);
      }

    }

    sshConn.connect(connection);

    return sshConn;
  }

};
