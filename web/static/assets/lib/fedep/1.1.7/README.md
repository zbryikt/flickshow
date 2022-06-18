# fedep

Frontend dependency installer. copy frontend modules to desired directory, with additional configurations in package.json:

  "scripts": {
    ...
    "postinstall": "./node_modules/.bin/fedep"
  },
  "frontendDependencies": {
    "root": "web/static/assets/lib",
    "modules": [ "ldLazy" ]
  }


by executing `npx fedep` or invoking via postinstall when `npm i`, `fedep` will do:

  - lookup package with given name in `node_modules` folder.
  - once found, copy content to `<root>/<name>/<version>` from folders of give source packages in following priority:
    - `<dir>` folder if `dir` option is given ( see below ).
    - `dist` folder if `<dir>` is omitted, `dist` exists and `--use-dist` option is set to true.
    - otherwise, the whole package is copied.
  - build a symbolic link from <version> to /main/


Once configuration is prepared, run:

    npx fedep


for a quick setup of `frontendDependencies` field, run:

    npx fedep init

you still have to update its fields according to what you need.


Additionally, you can also use local repo for a specific module:

    npx fedep -l <some-module>:<path-to-local-repo>

Use semi comma `;` to separate multiple pairs of local repos:

    npx fedep -l "mod1:path-to-mod1;mod2:path-to-mod2;mod3:path-to-mod3"


## Modules Format

you can use either string or object to list modules to be used. e.g.,

    ["ldLazy", ...,  {name: "ldview"}, ...]


If object is used, it contains following fields:

 - `name`: module name
 - `browserify`: true/object if browserify this module.
   - if it's an object, the object will be passed to browserify as it's option object.
 - `dir`: subdir to copy in this module. default the whole module, if not specified
 - `link`: set true to use symlink instead of copying. default false.
   - always false if `browserify` is set to true.


## Publish

Use `npx fedep publish` to publish based on `dist` folder along with core files such as `package.json`. For example, say you have following directory structure:

 - dist
   - index.js
 - README.md
 - CHANGELOG.md
 - package.json
 - LICENSE

`npx fedep publish` merge above content into `.fedep/publish` as below:

 - .fedep/publish
   - index.js
   - README.md
   - CHANGELOG.md
   - package.json
   - LICENSE

and trigger `npm publish --access public .fedep/publish`. Additionally, `npx fedep publish` also alters copied `package.json` with following changes to reflect the change of the directory structure:

 - `files` field removed
 - file path in following fields are converted from relative to `root` to relative to `dist`:
   - `style`, `browser`, `module`, `main`, `unpkg`

`publish` command also publish files listed in `files` field, with their original directory structure, except `dist` folder. `dist` is by default removed with its content moved to root. To keep `dist` folder, use `--dup true` option:

    npx fedep publish --dup true

You can also use a different dist folder by `folder` option:

    npx fedep publish --folder another-dist



## Alternatives

see also: 
 - frontend-dependencies - https://github.com/msurdi/frontend-dependencies
 - pancake - https://github.com/govau/pancake


## TODO

add test.


## License

MIT
