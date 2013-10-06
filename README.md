# grunt-compress-deploy

> Makes it easy and fast to deploy your project

## Getting Started
This plugin requires Grunt `~0.4.1`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-compress-deploy --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-compress-deploy');
```

## The "compress-deploy" task

## Usage
In your project's Gruntfile, add a section named `compress-deploy` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  compress-deploy: {
    your_target: {
      src : "/path/to/build",
      dest : "/path/on/server",
      server_sep : "/",
      clean : true,
      clean_exclusions : ['important', 'dont.touch'],
      auth: {
        host : 'yourdomain.com',
        port : 22,
        authKey : 'yourdomain.com'
      }.
    },
  },
})
```

### Options

#### src
Type: `String`

Directory, which will be transfered to the server.

#### dest
Type: `String`

Path to place on your server where the project should be put.

#### server_sep
Type: `String`
Default value: `path.sep`

What path separator your server uses?

#### clean
Type: `Boolean`
Default value: `false`

Determines whether to clean location on server before putting there the new version.

#### clean_exclusions
Type: `Array<String>`
Default value: `[]`

What elements must be preserved from the cleaning. Won't work if in `src` directory are files of the same names.

#### auth

Usernames, passwords, and private key references are stored as a JSON object in a file named `.ftppass`. This file should be omitted from source control. It uses the following format:

```javascript
{
  "key1": {
    "username": "username1",
    "password": "password1"
  },
  "key2": {
    "username": "username2",
    "password": "password2"
  },
  "privateKey": {
    "username": "username"
  },
  "privateKeyEncrypted": {
    "username": "username",
    "passphrase": "passphrase1"
  },
  "privateKeyCustom": {
    "username": "username",
    "passphrase": "passphrase1",
    "keyLocation": "/full/path/to/key"
  }
}
```

If `keyLocation` is not specified, `grunt-compress-deploy` looks for keys at `~/.ssh/id_dsa` and `/.ssh/id_rsa`.

You can supply passwords for encrypted keys with the `passphrase` attribute.

This way we can save as many username / password combinations as we want and look them up by the `authKey` value defined in the _grunt_ config file where the rest of the target parameters are defined.



## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
_(Nothing yet)_
