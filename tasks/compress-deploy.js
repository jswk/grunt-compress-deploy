/*
 * grunt-compress-deploy
 * https://github.com/jswk/grunt-compress-deploy
 *
 * Copyright (c) 2013 Jakub Sawicki
 * Licensed under the MIT license.
 */

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
      exclusions : [],
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
      fixPermissions,
      cleanDest,
      deployArchive,
      extractArchive,
      cleanArchive,
      fixPermissions,
      closeConnection,
      this.async()
    );
  });

  function handleCommand(ssh, command, message, cb) {
    var fail = function (message) {
      grunt.log.write(' failed'.red + '\n');
      grunt.warn(''+message);
    };

    grunt.log.write(message);

    ssh.exec(command, function (err, stream) {
      if (err) {
        fail(err);
      }

      stream.on('data', function (data, extended) {
        if (extended === 'stderr') {
          fail(command+'\n'+data);
        } else {
          grunt.log.write(''+data);
        }
      });

      stream.on('exit', function (code, signal) {
        if (code !== 0) {
          fail(command+"\nReturn code: "+code);
        }

        cb(function () {
          grunt.log.write(' done'.green + '\n');
        }, fail);
      });

    });
  }

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

  function getExcludedItems(options, folder) {
    var exclusions = options.exclusions,
        remoteSep = options.server_sep;

    // filter out dir and parent dir positions as well
    folder === true && (exclusions = exclusions.concat(['.','..','.'+remoteSep,'..'+remoteSep]));
    // as basic regex support in grep leaves only the function of '.' unchanged
    // plain dots must be preceded by backslash
    exclusions = exclusions.map(function (name) { return name.replace(/\./g, '\\.') });

    return exclusions;
  }

  function cleanDest(options, ssh) {
    var self             = this,
        clean            = options.clean,
        exclusions = getExcludedItems(options, true),
        remoteSep        = options.server_sep;

    if (!clean) {
      this(options, ssh);
    } else {
      // list all files in directory
      // filter out excluded ones
      // execute rm -rf for every entry left
      var command = 'cd '+getRootPath(options)+' && '+
                    'ls -a | grep -v "^\\('+exclusions.join('\\|')+'\\)$" | tr "\\n" "\\0" | xargs --no-run-if-empty -0 rm -rf';

      handleCommand(ssh, command, 'Cleaning dest directory', function (done) {
        done();
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

      grunt.log.write('Transferring ' + src + ' to ' + dest + '\n');

      var pace = require('pace')({
        total : fs.statSync(src).size,
        maxBurden : 10,
        texts : {
          info : "",
          unit : " bytes",
          finished : "Upload completed successfully\n".green
        }
      });

      sftp.fastPut(src, dest, {
        step: function (transferred, chunk, total) {
          pace.total = total;
          pace.op(transferred);
        }
      }, function (err) {
        if (err) {
          grunt.warn('SFTP :: PUT :: ' + err);
        }

        //grunt.log.write(' done'.green + '\n');

        sftp.end();
      })
    });
  }

  function extractArchive(options, ssh) {
    var self = this;
    var touchOption = options.touch ? 'm' : '';

    var command = 'cd '+getRootPath(options)+' && '+
                  'tar -' + touchOption + 'xzf ' + options.archive_name + ' --strip-components 1';

    handleCommand(ssh, command, 'Decompressing the archive', function (done) {
      done();
      self(options, ssh);
    });
  }

  function cleanArchive(options, ssh) {
    var self = this,
        command = 'cd '+getRootPath(options)+' && rm ' + options.archive_name;

    handleCommand(ssh, command, 'Removing archive from local and server', function (done, fail) {
      fs.unlink(path.resolve(options.archive_name), function (err) {
        if (err) {
          fail(err);
        }

        done();
        self(options, ssh);
      });
    });
  }

  function fixPermissions(options, ssh) {
    var self = this,
        remoteSep = options.server_sep;

    var grep1 = 'grep -v "^\\('+getExcludedItems(options, true).join('\\|')+'\\)$"';
    var grep2 = 'grep -v "^\\('+getExcludedItems(options).map(function (file) {
      return '\\.\\'+remoteSep+file;
    }).join('\\|')+'\\($\\|\\'+remoteSep+'\\)\\)"';

    var command = 'cd '+getRootPath(options)+' && '+
                  'ls -a | '+grep1+' | tr "\\n" "\\0" | xargs --no-run-if-empty -0 chmod -R 755 && '+
                  'find -type f | '+grep2+' | tr "\\n" "\\0" | xargs --no-run-if-empty -0 chmod 644';

    handleCommand(ssh, command, 'Fixing permissions', function (done) {
      done();
      self(options, ssh);
    });
  }

  function closeConnection(options, ssh) {
    var self = this;

    ssh.end();

    self();
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
